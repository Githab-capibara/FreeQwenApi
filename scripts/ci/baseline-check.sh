#!/usr/bin/env bash
#
# Compare a scanner's current findings against a recorded baseline.
#
# Policy (fail-closed for regressions):
#   - A finding that is NOT in the baseline -> NEW -> job fails.
#   - A finding that IS in the baseline       -> KNOWN -> reported, job passes.
#   - Scanner failure (non-zero exit, unreadable report) -> job fails.
#
# Baselines intentionally record pre-existing findings so that CI blocks
# regressions instead of being permanently red. Removing a finding from the
# baseline is a separate, reviewed change.
#
# Usage:
#   scripts/ci/baseline-check.sh <scanner-name> <current-report> <baseline-file>
#
#   current-report  JSON report produced by the scanner (raw scanner output)
#   baseline-file   JSON array of known finding keys (see
#                   scripts/ci/update-baselines.sh)
#
# Environment:
#   BASELINE_STRICT=1   Fail when the baseline contains entries that are no
#                       longer reported (forces baseline pruning).
#
set -euo pipefail

# `sort` and `comm` must agree on the collation order. Without this, the
# baseline is sorted in the C locale while `comm` compares in the ambient
# locale, and the comparison fails with "not in sorted order".
export LC_ALL=C

SCANNER="${1:?scanner name required}"
CURRENT="${2:?current report required}"
BASELINE="${3:?baseline file required}"

if [[ ! -f "${CURRENT}" ]]; then
  echo "::error title=${SCANNER}::scanner report not found: ${CURRENT}"
  exit 1
fi

# An empty report means that the scanner did not run to completion: several
# scanners exit non-zero on a finding and write nothing when they crash. Such
# a report must never be mistaken for "the scanner found nothing".
if [[ ! -s "${CURRENT}" ]]; then
  echo "::error title=${SCANNER}::the scanner report is empty; the scan did not complete"
  exit 1
fi

# The report has to be a JSON document, otherwise the finding extraction
# below would silently produce an empty result. Most scanners write an
# object; Checkov writes an array of result documents.
if ! jq -e 'type == "object" or type == "array"' "${CURRENT}" >/dev/null 2>&1; then
  echo "::error title=${SCANNER}::the scanner report is not a JSON document"
  exit 1
fi

# The report has to carry the section that holds the findings. A scanner that
# fails — for example `npm audit` when the registry is unreachable — writes a
# valid JSON document without that section, which would otherwise be read as
# "the scanner found nothing".
#
# The expression is evaluated against the report; it must succeed for the
# report to be accepted.
case "${SCANNER}" in
  semgrep) REQUIRED='has("results")' ;;
  bandit) REQUIRED='has("results")' ;;
  njsscan) REQUIRED='has("nodejs") or has("templates")' ;;
  bearer) REQUIRED='has("critical") or has("high") or has("medium") or has("low")' ;;
  checkov) REQUIRED='any(.[]; (.results | type) == "object" and (.results | has("failed_checks")))' ;;
  npm-audit) REQUIRED='has("vulnerabilities")' ;;
  osv) REQUIRED='has("results")' ;;
  trivy-image) REQUIRED='has("Results")' ;;
  grype-image) REQUIRED='has("matches")' ;;
  dockle) REQUIRED='has("details")' ;;
  *) REQUIRED='' ;;
esac

if [[ -n "${REQUIRED}" ]]; then
  if ! jq -e "${REQUIRED}" "${CURRENT}" >/dev/null 2>&1; then
    echo "::error title=${SCANNER}::the scanner report does not contain the findings section; the scan did not complete"
    exit 1
  fi
fi

# Normalise both documents to a sorted list of stable finding keys.
extract_keys() {
  local file="$1"
  case "${SCANNER}" in
    semgrep)
      jq -r '.results[]
            | "\(.check_id)|\(.path)|\(.start.line)|\(.extra.fingerprint // "")"' "${file}"
      ;;
    bandit)
      jq -r '.results[]
            | "\(.test_id)|\(.filename)|\(.line_number)|\(.issue_confidence)"' "${file}"
      ;;
    njsscan)
      jq -r '(.nodejs // {}), (.templates // {})
            | to_entries[]
            | .key as $rule
            | .value.files[]?
            | .file_path as $file
            | .match_lines[]?
            | "\($rule)|\($file)|\(.)"' "${file}"
      ;;
    bearer)
      jq -r '(.critical // []), (.high // []), (.medium // []), (.low // [])
            | .[]
            | "\(.id)|\(.filename)|\(.line_number)|\(.fingerprint // "")"' "${file}"
      ;;
    checkov)
      jq -r 'if type == "array" then .[] else . end
            | .results.failed_checks[]?
            | "\(.check_id)|\(.file_path)|\(.file_line_range[0] // 0)"' "${file}"
      ;;
    npm-audit)
      jq -r '.vulnerabilities // {}
            | to_entries[]
            | "\(.key)|\(.value.severity)|\(.value.range)"' "${file}"
      ;;
    osv)
      jq -r '.results[]?.packages[]?
            | "\(.package.name)|\(.package.version)|\([.vulnerabilities[]?.id] | sort | join(","))"' \
        "${file}"
      ;;
    trivy-image)
      # Container image scan (Trivy). The key deliberately omits the installed
      # version: a dependency bump that removes a finding shrinks the baseline
      # entry, and a bump that introduces a new advisory produces a new key.
      jq -r '.Results[]?.Vulnerabilities[]?
            | "\(.VulnerabilityID)|\(.PkgName)|\(.Severity)"' "${file}"
      ;;
    grype-image)
      # Container image scan (Grype), scoped to the operating-system packages
      # and the application dependency layer. Generic binary CPE matches
      # (`chrome`, `node`) are excluded: Grype cannot version-match those
      # binaries reliably and reports thousands of unusable findings.
      jq -r '.matches[]?
            | select(.artifact.type == "deb" or .artifact.type == "npm")
            | select(.vulnerability.severity == "Critical" or .vulnerability.severity == "High")
            | "\(.vulnerability.id)|\(.artifact.name)|\(.vulnerability.severity)"' "${file}"
      ;;
    dockle)
      # Container image best-practice scan (Dockle).
      jq -r '.details[]?
            | .code as $code
            | .level as $level
            | (.alerts[]? | "\($code)|\($level)|\(.)")' "${file}"
      ;;
    *)
      echo "::error title=${SCANNER}::unknown scanner name for baseline extraction"
      exit 1
      ;;
  esac
}

if [[ ! -f "${BASELINE}" ]]; then
  echo "::error title=${SCANNER}::baseline file not found: ${BASELINE}"
  echo "::notice title=${SCANNER}::generate it locally and review it before committing"
  exit 1
fi

if ! jq -e 'type == "array"' "${BASELINE}" >/dev/null 2>&1; then
  echo "::error title=${SCANNER}::baseline must be a JSON array of finding keys"
  exit 1
fi

current_keys="$(extract_keys "${CURRENT}" | LC_ALL=C sort -u)"
baseline_keys="$(jq -r '.[]' "${BASELINE}" | LC_ALL=C sort -u)"

new_keys="$(comm -23 <(printf '%s\n' "${current_keys}") <(printf '%s\n' "${baseline_keys}") | sed '/^$/d')"
resolved_keys="$(comm -13 <(printf '%s\n' "${current_keys}") <(printf '%s\n' "${baseline_keys}") | sed '/^$/d')"

if [[ -n "${new_keys}" ]]; then
  echo "::error title=${SCANNER}::${SCANNER} reported findings that are not in the baseline (regression)"
  count="$(printf '%s\n' "${new_keys}" | wc -l | tr -d ' ')"
  echo "::error title=${SCANNER}::new finding count: ${count}"
  while IFS= read -r key; do
    [[ -z "${key}" ]] && continue
    echo "::error title=${SCANNER}::${key}"
  done <<< "${new_keys}"
  exit 1
fi

if [[ "${BASELINE_STRICT:-0}" == "1" && -n "${resolved_keys}" ]]; then
  echo "::error title=${SCANNER}::baseline contains findings that are no longer reported"
  while IFS= read -r key; do
    [[ -z "${key}" ]] && continue
    echo "::error title=${SCANNER}::stale baseline entry: ${key}"
  done <<< "${resolved_keys}"
  exit 1
fi

known_count="$(printf '%s\n' "${current_keys}" | sed '/^$/d' | wc -l | tr -d ' ')"
echo "::notice title=${SCANNER}::no new findings; ${known_count} known finding(s) match the baseline"
exit 0
