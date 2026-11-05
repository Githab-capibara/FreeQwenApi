#!/usr/bin/env bash
#
# Verify the runtime authentication behaviour of the API.
#
# The check is performed against a running instance (the CI job starts an
# isolated server with a throw-away key and a mock upstream). It is
# fail-closed: every expectation must hold.
#
# Usage:
#   scripts/ci/verify-api-auth-enforcement.sh <base-url> <api-key>
#
#   base-url  e.g. http://127.0.0.1:3264/api
#   api-key   the client key that the server accepts
#
set -euo pipefail

BASE_URL="${1:?base url required}"
API_KEY="${2:?api key required}"

# Endpoints that are protected by the authorization middleware.
PROTECTED_ENDPOINTS=(
  "/health"
  "/models"
  "/v1/models"
  "/status"
)

status=0

request_status() {
  local path="$1"
  shift
  curl -s -m 15 -o /dev/null -w '%{http_code}' "$@" "${BASE_URL}${path}"
}

expect_status() {
  local label="$1"
  local path="$2"
  local expected="$3"
  shift 3
  local actual
  actual="$(request_status "${path}" "$@")"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "::error title=Auth enforcement::${label}: expected ${expected}, got ${actual} (${path})"
    status=1
  else
    echo "::notice title=Auth enforcement::${label}: ${actual} (${path})"
  fi
}

echo "::group::Authentication enforcement against ${BASE_URL}"

# The service root is intentionally public (it is registered before the
# authorization middleware) and must answer without credentials.
expect_status "public root without credentials" "/" "200"

for path in "${PROTECTED_ENDPOINTS[@]}"; do
  # 1. No credentials at all.
  expect_status "protected endpoint without credentials" "${path}" "401"

  # 2. A wrong bearer token.
  expect_status "protected endpoint with an invalid token" "${path}" "401" \
    -H "Authorization: Bearer definitely-not-a-valid-key"

  # 3. The right key, but without the "Bearer " scheme prefix.
  expect_status "protected endpoint without the Bearer scheme" "${path}" "401" \
    -H "Authorization: ${API_KEY}"

  # 4. The right key with the wrong scheme.
  expect_status "protected endpoint with an unknown scheme" "${path}" "401" \
    -H "Authorization: Basic ${API_KEY}"

  # 5. The correct credential must not be rejected by the auth middleware.
  actual="$(request_status "${path}" -H "Authorization: Bearer ${API_KEY}")"
  if [[ "${actual}" == "401" || "${actual}" == "403" ]]; then
    echo "::error title=Auth enforcement::valid credential was rejected with ${actual} (${path})"
    status=1
  else
    echo "::notice title=Auth enforcement::valid credential accepted with ${actual} (${path})"
  fi
done

echo "::endgroup::"

if [[ "${status}" -ne 0 ]]; then
  exit 1
fi

echo "::notice title=Auth enforcement::the API rejects missing, malformed and invalid credentials"
exit 0
