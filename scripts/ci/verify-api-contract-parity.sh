#!/usr/bin/env bash
#
# Verify that the OpenAPI contract, the Node/Express implementation and the
# Python/FastAPI entrypoint agree on the public API surface.
#
# Fail-closed rules:
#   1. Every path documented in openapi/openapi.yaml must be implemented by
#      the Express router in src/api/routes.js.
#   2. Every route registered by the FastAPI app in main.py must be
#      documented in the contract.
#   3. The contract must not contain duplicate operationIds.
#
# Node-only routes are reported as informational: the contract intentionally
# describes the security-relevant, publicly supported surface, while the
# router also exposes a few internal helpers.
#
# Usage: scripts/ci/verify-api-contract-parity.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

CONTRACT="openapi/openapi.yaml"
ROUTER="src/api/routes.js"
PY_ENTRYPOINT="main.py"

for file in "${CONTRACT}" "${ROUTER}" "${PY_ENTRYPOINT}"; do
  if [[ ! -f "${file}" ]]; then
    echo "::error title=API parity::required file is missing: ${file}"
    exit 1
  fi
done

work_dir="$(mktemp -d)"
trap 'rm -rf "${work_dir}"' EXIT

# --- Contract paths ---------------------------------------------------------
# OpenAPI path keys are indented by two spaces and end with a colon.
grep -E '^  /[^:]*:[[:space:]]*$' "${CONTRACT}" \
  | sed -E 's/^  ([^:]+):[[:space:]]*$/\1/' \
  | LC_ALL=C sort -u > "${work_dir}/contract.paths"

if [[ ! -s "${work_dir}/contract.paths" ]]; then
  echo "::error title=API parity::no paths were extracted from ${CONTRACT}"
  exit 1
fi

# --- Node router paths ------------------------------------------------------
# Express parameters use `:name`, OpenAPI uses `{name}`.
grep -oE "router\.(get|post|put|delete|patch|head)\('[^']+'" "${ROUTER}" \
  | sed -E "s/router\.[a-z]+\('//" \
  | sed -E "s/'\$//" \
  | sed -E 's/:([A-Za-z0-9_]+)/{\1}/g' \
  | LC_ALL=C sort -u > "${work_dir}/node.paths"

# --- Python entrypoint paths ------------------------------------------------
# FastAPI decorators carry the full `/api/...` prefix.
grep -oE '@app\.(get|post|put|delete|patch)\("[^"]+"' "${PY_ENTRYPOINT}" \
  | sed -E 's/@app\.[a-z]+\("//' \
  | sed -E 's/"$//' \
  | sed -E 's#^/api(/|$)#\1#' \
  | sed -E 's#^$#/#' \
  | LC_ALL=C sort -u > "${work_dir}/python.paths"

status=0

# Rule 1: contract paths must exist in the Node router.
missing_in_node="$(comm -23 "${work_dir}/contract.paths" "${work_dir}/node.paths")"
if [[ -n "${missing_in_node}" ]]; then
  echo "::error title=API parity::contract paths are not implemented by ${ROUTER}"
  while IFS= read -r path; do
    [[ -z "${path}" ]] && continue
    echo "::error title=API parity::missing implementation: ${path}"
  done <<< "${missing_in_node}"
  status=1
fi

# Rule 2: Python routes must be documented.
missing_in_contract="$(comm -23 "${work_dir}/python.paths" "${work_dir}/contract.paths")"
if [[ -n "${missing_in_contract}" ]]; then
  echo "::error title=API parity::${PY_ENTRYPOINT} exposes undocumented routes"
  while IFS= read -r path; do
    [[ -z "${path}" ]] && continue
    echo "::error title=API parity::undocumented route: ${path}"
  done <<< "${missing_in_contract}"
  status=1
fi

# Rule 3: operationIds must be unique.
duplicates="$(grep -E '^[[:space:]]+operationId:' "${CONTRACT}" \
  | sed -E 's/^[[:space:]]+operationId:[[:space:]]*//' \
  | LC_ALL=C sort | uniq -d)"
if [[ -n "${duplicates}" ]]; then
  echo "::error title=API parity::duplicate operationId values found"
  while IFS= read -r op; do
    [[ -z "${op}" ]] && continue
    echo "::error title=API parity::duplicate operationId: ${op}"
  done <<< "${duplicates}"
  status=1
fi

node_only="$(comm -13 "${work_dir}/contract.paths" "${work_dir}/node.paths")"
if [[ -n "${node_only}" ]]; then
  echo "::notice title=API parity::Node-only routes (not part of the public contract):"
  while IFS= read -r path; do
    [[ -z "${path}" ]] && continue
    echo "::notice title=API parity::node-only route: ${path}"
  done <<< "${node_only}"
fi

if [[ "${status}" -ne 0 ]]; then
  exit 1
fi

echo "::notice title=API parity::contract (${CONTRACT}), Node router and Python entrypoint agree"
exit 0
