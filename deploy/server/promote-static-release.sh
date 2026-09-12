#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
PATH=/opt/blackproof/node/bin:/usr/bin:/bin
export PATH

current_root="/var/www/html/blackproof"
releases_root="/var/www/html/blackproof-releases"
base_url="https://blackproof.fr"
runtime="/opt/blackproof/node/bin/node"
service_directory="/opt/blackproof-release"
trusted_script="$service_directory/promote-static-release.sh"
verifier_path="$service_directory/verify-release-directory.mjs"
smoke_path="$service_directory/smoke-apache-prod.sh"
activation_receipt="/run/blackproof-static-release.ready"

if [[ ${EUID:-$(id -u)} -eq 0 || $# -ne 5 ]]; then
  echo "Usage: /opt/blackproof-release/promote-static-release.sh CANDIDATE_DIR MANIFEST EXPECTED_COMMIT EXPECTED_ARTIFACT_SHA256 open-source" >&2
  exit 2
fi

candidate_root=$1
manifest_path=$2
expected_commit=$3
expected_artifact_sha256=$4
expected_access_model=$5

invoked_script=$(realpath -e -- "${BASH_SOURCE[0]}")
if [[ "$invoked_script" != "$trusted_script" \
  || -L "$trusted_script" || ! -f "$trusted_script" \
  || "$(stat -c '%U:%G:%a' -- "$trusted_script")" != "root:root:755" ]]; then
  echo "Static promotion must run as the non-root deploy user from its reviewed root-owned installation." >&2
  exit 2
fi
for trusted_helper in "$verifier_path" "$smoke_path"; do
  if [[ -L "$trusted_helper" || ! -f "$trusted_helper" \
    || "$(stat -c '%U:%G:%a' -- "$trusted_helper")" != "root:root:644" ]]; then
    echo "A root-owned static promotion helper is missing or unsafe." >&2
    exit 2
  fi
done

if [[ ! "$expected_commit" =~ ^[a-f0-9]{40}$ \
  || ! "$expected_artifact_sha256" =~ ^[a-f0-9]{64}$ \
  || "$candidate_root" != "/var/www/html/blackproof-candidate-${expected_commit}" \
  || "$manifest_path" != "/var/www/html/blackproof-promotion-${expected_commit}/artifact-manifest.json" \
  || "$expected_access_model" != "open-source" ]]; then
  echo "Promotion paths or expected commit are invalid." >&2
  exit 2
fi

for directory in "$current_root" "$candidate_root"; do
  directory_mode=$(stat -c '%a' -- "$directory" 2>/dev/null || true)
  if [[ ! -d "$directory" || -L "$directory" || "$(stat -c '%U' -- "$directory")" != "$(id -un)" \
    || ! "$directory_mode" =~ ^[0-7]{3,4}$ ]]; then
    echo "The current and candidate releases must be non-writable real directories owned by the deploy user." >&2
    exit 2
  fi
  if (( (8#$directory_mode & 0022) != 0 )); then
    echo "The current and candidate releases must not be writable by group or others." >&2
    exit 2
  fi
done
manifest_mode=$(stat -c '%a' -- "$manifest_path" 2>/dev/null || true)
if [[ ! -f "$manifest_path" || -L "$manifest_path" \
  || "$(stat -c '%U' -- "$manifest_path")" != "$(id -un)" \
  || ! "$manifest_mode" =~ ^[0-7]{3,4}$ ]]; then
  echo "The promotion manifest must be a non-writable regular file owned by the deploy user." >&2
  exit 2
fi
if (( (8#$manifest_mode & 0022) != 0 )); then
  echo "The promotion manifest must not be writable by group or others." >&2
  exit 2
fi
if [[ "$(stat -c '%d' -- "$current_root")" != "$(stat -c '%d' -- "$candidate_root")" ]]; then
  echo "Atomic exchange requires current and candidate releases on the same filesystem." >&2
  exit 2
fi

if [[ ! -f "$activation_receipt" || -L "$activation_receipt" \
  || "$(stat -c '%U:%G:%a' -- "$activation_receipt")" != "root:root:444" \
  || "$(stat -c '%s' -- "$activation_receipt")" -gt 512 ]]; then
  echo "The root-owned static activation release receipt is missing or unsafe." >&2
  exit 2
fi
receipt_before=$(stat -c '%d:%i:%s:%Y:%Z' -- "$activation_receipt")
mapfile -t receipt_lines < "$activation_receipt"
receipt_after=$(stat -c '%d:%i:%s:%Y:%Z' -- "$activation_receipt")
if [[ "$receipt_before" != "$receipt_after" || ${#receipt_lines[@]} -ne 4 ]]; then
  echo "The static activation release receipt changed or has an invalid line count." >&2
  exit 2
fi
if [[ "${receipt_lines[0]}" != "format=1" \
  || "${receipt_lines[1]}" != "commit=$expected_commit" \
  || "${receipt_lines[2]}" != "artifact_sha256=$expected_artifact_sha256" ]]; then
  echo "The static activation release receipt does not match the exact qualified artifact." >&2
  exit 2
fi
if [[ ! "${receipt_lines[3]}" =~ ^activated_at_epoch=([0-9]{10})$ ]]; then
  echo "The static activation release receipt has an invalid activation time." >&2
  exit 2
fi
activated_at_epoch=${BASH_REMATCH[1]}
current_epoch=$(date +%s)
if (( activated_at_epoch > current_epoch || current_epoch - activated_at_epoch > 7200 )); then
  echo "The static activation release receipt is stale or from the future." >&2
  exit 2
fi
unset receipt_before receipt_after receipt_lines activated_at_epoch current_epoch

"$runtime" "$verifier_path" "$manifest_path" "$candidate_root" \
  "$expected_commit" "$expected_artifact_sha256"

assert_status_contract() {
  "$runtime" -e '
    const payload = JSON.parse(process.argv[1]);
    if (payload?.releaseCommit !== process.argv[2]
      || payload?.securityPosture?.accessModel !== "open-source"
      || payload?.securityPosture?.accessRequirement !== "none"
      || payload?.securityPosture?.softwareLicense !== "AGPL-3.0-only"
      || payload?.securityPosture?.publicDeliveryStatusRegistry !== false) process.exit(1);
  ' "$1" "$expected_commit"
}

assert_retired_routes_closed() {
  local retired_status
  retired_status=$(/usr/bin/curl --silent --show-error --max-time 15 \
    --output /dev/null --write-out '%{http_code}' "${base_url}/api/license/checkout")
  if [[ "$retired_status" != "410" ]]; then
    echo "The retired dynamic namespace must return 410 before static promotion." >&2
    return 1
  fi
}

candidate_status_path="$candidate_root/api/status.json"
if [[ ! -f "$candidate_status_path" || -L "$candidate_status_path" \
  || "$(stat -c '%s' -- "$candidate_status_path")" -gt 65536 ]]; then
  echo "The candidate public status is missing or unsafe." >&2
  exit 1
fi
candidate_status_body=$(cat -- "$candidate_status_path")
assert_status_contract "$candidate_status_body"
unset candidate_status_body candidate_status_path
assert_retired_routes_closed

atomic_exchange() {
  /usr/bin/python3 - "$current_root" "$candidate_root" <<'PY'
import ctypes
import errno
import os
import sys

current, candidate = (os.fsencode(path) for path in sys.argv[1:3])
libc = ctypes.CDLL(None, use_errno=True)
renameat2 = getattr(libc, "renameat2", None)
if renameat2 is None:
    raise SystemExit("renameat2 is unavailable; refusing a non-atomic promotion")
renameat2.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
renameat2.restype = ctypes.c_int
if renameat2(-100, current, -100, candidate, 2) != 0:
    error = ctypes.get_errno()
    raise OSError(error, errno.errorcode.get(error, "renameat2 failed"))
PY
}

rollback_required=0
rollback() {
  local exit_status=$1
  trap - ERR INT TERM
  if [[ "$rollback_required" == "1" ]]; then
    echo "Post-promotion verification failed; atomically restoring the previous release." >&2
    atomic_exchange || echo "CRITICAL: atomic rollback failed." >&2
  fi
  exit "$exit_status"
}
trap 'rollback $?' ERR
trap 'rollback 130' INT
trap 'rollback 143' TERM

atomic_exchange
rollback_required=1

# Re-read every byte from the path that Apache now serves. Any swap-time drift
# reaches the ERR trap and atomically restores the previous directory.
"$runtime" "$verifier_path" "$manifest_path" "$current_root" \
  "$expected_commit" "$expected_artifact_sha256"

status_body=$(/usr/bin/curl --fail --silent --show-error --max-time 15 \
  "${base_url}/api/status.json")
assert_status_contract "$status_body"
unset status_body

PATH="/opt/blackproof/node/bin:/usr/bin:/bin" \
  BLACKPROOF_SOURCE_CONTRACT_MODE=exact-ci-artifact \
  CURL_BIN=/usr/bin/curl \
  /usr/bin/bash "$smoke_path" "$base_url"

assert_retired_routes_closed

rollback_required=0
trap - ERR INT TERM
mkdir -p -- "$releases_root"
archive_path="${releases_root}/previous-$(date -u +%Y%m%dT%H%M%SZ)-before-${expected_commit}"
mv -- "$candidate_root" "$archive_path"
printf 'Atomic production promotion passed: commit=%s access=%s previous=%s\n' \
  "$expected_commit" "$expected_access_model" "$archive_path"
