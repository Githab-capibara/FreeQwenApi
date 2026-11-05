#!/usr/bin/env bash
#
# Run Semgrep with the rule set that the FreeQwenApi pipeline uses.
#
# The script is the single definition of the rule set: the CI job and the
# baseline generator both call it, so the recorded baseline always describes
# exactly the scan that the pipeline performs.
#
# Rule layers:
#   1. Community registry rulesets (p/ci, p/security-audit, p/secrets) — the
#      broad, upstream-maintained coverage.
#   2. .semgrep.yml — the repository-specific rules that model the risks of
#      this project.
#
# The registry rulesets are not version-pinnable, therefore a rule that
# Semgrep publishes later may report a finding that the baseline does not
# list. That is intended: the gate is fail-closed and the new finding has to
# be reviewed before the baseline is extended.
#
# Usage:
#   scripts/ci/run-semgrep.sh <output-report.json>
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT="${1:?output report path required}"

cd "${ROOT}"

# `--error` is deliberately omitted: Semgrep must not turn a finding into a
# scanner failure, because the baseline comparison decides whether the build
# may pass. A genuine scanner failure (an unreachable ruleset, an invalid
# configuration) still exits non-zero and fails the job.
if ! semgrep scan \
  --config p/ci \
  --config p/security-audit \
  --config p/secrets \
  --config .semgrep.yml \
  --metrics=off \
  --exclude node_modules \
  --exclude .git \
  --json \
  --output "${OUTPUT}"; then
  echo "::error title=Semgrep::the scanner failed; the scan produced no trustworthy result"
  if [[ -f "${OUTPUT}" ]]; then
    jq -r '.errors[]? | "::error title=Semgrep::\(.message // .type // "unknown error")"' "${OUTPUT}" || true
  fi
  exit 1
fi

# A report that carries scanner errors is not a trustworthy result.
if [[ -f "${OUTPUT}" ]] && jq -e '(.errors // []) | length > 0' "${OUTPUT}" >/dev/null 2>&1; then
  echo "::error title=Semgrep::the scanner reported errors; the result is not trustworthy"
  jq -r '.errors[]? | "::error title=Semgrep::\(.message // .type // "unknown error")"' "${OUTPUT}"
  exit 1
fi

echo "::notice title=Semgrep::the scan completed; the baseline comparison decides the build"
