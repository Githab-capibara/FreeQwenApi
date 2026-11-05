#!/usr/bin/env bash
#
# Regenerate the security baselines that track pre-existing findings.
#
# Run this deliberately, review the diff, and commit it together with the
# change that introduced or resolved the findings. Never regenerate a
# baseline just to make CI green.
#
# Usage: scripts/ci/update-baselines.sh [--source-only]
#
#   --source-only   Skip the container-image baselines (Trivy, Grype, Dockle).
#                   The image baselines require a locally built image; set
#                   IMAGE_REF to scan a different tag.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

IMAGE_REF="${IMAGE_REF:-qwen-api-proxy:ci}"
SOURCE_ONLY=0
if [[ "${1:-}" == "--source-only" ]]; then
  SOURCE_ONLY=1
fi

OUT_DIR=".security-baseline"
REPORT_DIR="security-reports/baseline"
mkdir -p "${OUT_DIR}" "${REPORT_DIR}"

# The scanner images are pinned by digest in a single file, so that the
# baseline describes exactly the scan that the pipeline performs.
# shellcheck source=/dev/null
source "${ROOT}/.github/scanner-images.env"

# Each baseline is a JSON array of stable finding keys. The matching .txt
# file is kept for human review and easy diffing. Raw scanner reports are
# written to REPORT_DIR for local debugging; CI regenerates its own report
# and compares it against the tracked baseline.
write_baseline() {
  local name="$1"
  local keys_file="${REPORT_DIR}/${name}.keys"
  jq -R -s 'split("\n") | map(select(length > 0)) | sort' \
    "${keys_file}" > "${OUT_DIR}/${name}.json"
  mv "${keys_file}" "${OUT_DIR}/${name}.txt"
}

echo "==> Semgrep"
# The same runner that the CI job uses, so the baseline describes exactly the
# scan that the pipeline performs.
bash "${ROOT}/scripts/ci/run-semgrep.sh" "${REPORT_DIR}/semgrep.json" || true
jq -r '.results[]
      | "\(.check_id)|\(.path)|\(.start.line)|\(.extra.fingerprint // "")"' \
  "${REPORT_DIR}/semgrep.json" | LC_ALL=C sort -u > "${REPORT_DIR}/semgrep.keys"

echo "==> Bandit"
bandit -c .bandit -r main.py python_affinity.py -f json -o "${REPORT_DIR}/bandit.json" -q || true
jq -r '.results[]
      | "\(.test_id)|\(.filename)|\(.line_number)|\(.issue_confidence)"' \
  "${REPORT_DIR}/bandit.json" | LC_ALL=C sort -u > "${REPORT_DIR}/bandit.keys"

echo "==> NodeJSScan"
njsscan -c .njsscan src/ index.js scripts/ --json > "${REPORT_DIR}/njsscan.json" 2>/dev/null || true
jq -r '(.nodejs // {}), (.templates // {})
      | to_entries[]
      | .key as $rule
      | .value.files[]?
      | .file_path as $file
      | .match_lines[]?
      | "\($rule)|\($file)|\(.)"' \
  "${REPORT_DIR}/njsscan.json" | LC_ALL=C sort -u > "${REPORT_DIR}/njsscan.keys"

echo "==> Bearer"
docker run --rm -v "${ROOT}:/repo" -w /repo "${BEARER_IMAGE}" \
  scan --report security --severity critical,high --format json \
  --skip-path node_modules \
  . \
  > "${REPORT_DIR}/bearer.json" 2>/dev/null || true
jq -r '(.critical // []), (.high // [])
      | .[]
      | "\(.id)|\(.filename)|\(.line_number)|\(.fingerprint // "")"' \
  "${REPORT_DIR}/bearer.json" | LC_ALL=C sort -u > "${REPORT_DIR}/bearer.keys"

echo "==> Checkov"
rm -rf "${REPORT_DIR}/checkov"
checkov -d . --compact --framework dockerfile --framework github_actions \
  -o json --output-file-path "${REPORT_DIR}/checkov" >/dev/null 2>&1 || true
CHECKOV_REPORT="$(find "${REPORT_DIR}/checkov" -name 'results_json.json' -print -quit 2>/dev/null || true)"
if [[ -n "${CHECKOV_REPORT}" && -f "${CHECKOV_REPORT}" ]]; then
  jq -r 'if type == "array" then .[] else . end
        | .results.failed_checks[]?
        | "\(.check_id)|\(.file_path)|\(.file_line_range[0] // 0)"' \
    "${CHECKOV_REPORT}" | LC_ALL=C sort -u > "${REPORT_DIR}/checkov.keys"
else
  : > "${REPORT_DIR}/checkov.keys"
fi

echo "==> npm audit"
npm audit --omit=dev --json > "${REPORT_DIR}/npm-audit.json" || true
jq -r '.vulnerabilities // {}
      | to_entries[]
      | "\(.key)|\(.value.severity)|\(.value.range)"' \
  "${REPORT_DIR}/npm-audit.json" | LC_ALL=C sort -u > "${REPORT_DIR}/npm-audit.keys"

echo "==> OSV-Scanner"
docker run --rm -v "${ROOT}:/repo" -w /repo "${OSV_SCANNER_IMAGE}" \
  scan source /repo --format json \
  > "${REPORT_DIR}/osv.json" 2>/dev/null || true
jq -r '.results[]?.packages[]?
      | "\(.package.name)|\(.package.version)|\([.vulnerabilities[]?.id] | sort | join(","))"' \
  "${REPORT_DIR}/osv.json" | LC_ALL=C sort -u > "${REPORT_DIR}/osv.keys"

for scanner in semgrep bandit njsscan bearer checkov npm-audit osv; do
  write_baseline "${scanner}"
done

if [[ "${SOURCE_ONLY}" -eq 0 ]]; then
  if ! docker image inspect "${IMAGE_REF}" >/dev/null 2>&1; then
    echo "::error title=Baselines::image not found locally: ${IMAGE_REF}"
    echo "::notice title=Baselines::build it first: docker build -t ${IMAGE_REF} ."
    exit 1
  fi

  echo "==> Trivy (container image)"
  rm -f "${REPORT_DIR}/trivy-image.json"
  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "${ROOT}/${REPORT_DIR}:/out" \
    "${TRIVY_IMAGE}" \
    image --format json --output /out/trivy-image.json \
    --severity HIGH,CRITICAL --ignore-unfixed \
    "${IMAGE_REF}" >/dev/null 2>&1 || true
  jq -r '.Results[]?.Vulnerabilities[]?
        | "\(.VulnerabilityID)|\(.PkgName)|\(.Severity)"' \
    "${REPORT_DIR}/trivy-image.json" | LC_ALL=C sort -u > "${REPORT_DIR}/trivy-image.keys"

  echo "==> Grype (container image)"
  rm -f "${REPORT_DIR}/grype-image.json"
  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "${ROOT}/${REPORT_DIR}:/out" \
    "${GRYPE_IMAGE}" \
    "image:${IMAGE_REF}" --output json --file /out/grype-image.json --only-fixed \
    >/dev/null 2>&1 || true
  jq -r '.matches[]?
        | select(.artifact.type == "deb" or .artifact.type == "npm")
        | select(.vulnerability.severity == "Critical" or .vulnerability.severity == "High")
        | "\(.vulnerability.id)|\(.artifact.name)|\(.vulnerability.severity)"' \
    "${REPORT_DIR}/grype-image.json" | LC_ALL=C sort -u > "${REPORT_DIR}/grype-image.keys"

  echo "==> Dockle (container image)"
  rm -f "${REPORT_DIR}/dockle-image.json"
  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    "${DOCKLE_IMAGE}" \
    --exit-code 1 --exit-level INFO -f json \
    "${IMAGE_REF}" > "${REPORT_DIR}/dockle-image.json" 2>/dev/null || true
  jq -r '.details[]?
        | .code as $code
        | .level as $level
        | (.alerts[]? | "\($code)|\($level)|\(.)")' \
    "${REPORT_DIR}/dockle-image.json" | LC_ALL=C sort -u > "${REPORT_DIR}/dockle.keys"

  write_baseline "trivy-image"
  write_baseline "grype-image"
  write_baseline "dockle"
fi

echo
echo "Baselines written to ${OUT_DIR}:"
for scanner in semgrep bandit njsscan bearer checkov npm-audit osv trivy-image grype-image dockle; do
  if [[ -f "${OUT_DIR}/${scanner}.json" ]]; then
    printf '  %-14s %s finding(s)\n' "${scanner}" "$(jq 'length' "${OUT_DIR}/${scanner}.json")"
  fi
done
