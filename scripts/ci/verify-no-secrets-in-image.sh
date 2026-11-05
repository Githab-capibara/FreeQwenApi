#!/usr/bin/env bash
#
# Verify that a built container image contains no credential material.
#
# The check is strict and has no baseline: a secret that reaches an image
# layer is unrecoverable once the image is published.
#
# Usage: scripts/ci/verify-no-secrets-in-image.sh <image-reference>
#
set -euo pipefail

IMAGE="${1:?image reference required}"

if ! docker image inspect "${IMAGE}" >/dev/null 2>&1; then
  echo "::error title=Image secrets::image not found locally: ${IMAGE}"
  exit 1
fi

status=0

# --- 1. Image build history -------------------------------------------------
# Secrets are frequently passed as build arguments and therefore survive in
# the layer metadata even when the file itself is deleted later.
history_output="$(docker history --no-trunc "${IMAGE}")"
if printf '%s' "${history_output}" \
  | grep -qiE '(AUTH_KEYS|Authorization\.txt|DASHSCOPE_API_KEY|BEGIN [A-Z ]*PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,})'; then
  echo "::error title=Image secrets::secret material detected in image history"
  status=1
fi

# --- 2. Image filesystem ----------------------------------------------------
container_id="$(docker create "${IMAGE}")"
trap 'docker rm -f "${container_id}" >/dev/null 2>&1 || true' EXIT

file_listing="$(docker export "${container_id}" | tar -tf - 2>/dev/null || true)"

for path in /app/.env /app/src/Authorization.txt /app/proxies.txt /app/.git /app/session; do
  if printf '%s\n' "${file_listing}" | grep -qx "${path}"; then
    echo "::error title=Image secrets::${path} must not be present in the image"
    status=1
  fi
done

# --- 3. Credential material inside files ------------------------------------
# Extract the regular files and grep them for high-signal credential patterns.
extract_dir="$(mktemp -d)"
trap 'rm -rf "${extract_dir}"; docker rm -f "${container_id}" >/dev/null 2>&1 || true' EXIT
docker export "${container_id}" | tar -xf - -C "${extract_dir}" 2>/dev/null || true

if [[ -d "${extract_dir}/app" ]]; then
  if grep -rlIE \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    '(-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|xox[baprs]-[A-Za-z0-9-]{10,})' \
    "${extract_dir}/app" 2>/dev/null | grep -q .; then
    echo "::error title=Image secrets::credential material found inside the image filesystem"
    status=1
  fi
fi

if [[ "${status}" -ne 0 ]]; then
  exit 1
fi

echo "::notice title=Image secrets::no credential material found in ${IMAGE}"
exit 0
