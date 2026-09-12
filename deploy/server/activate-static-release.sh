#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
PATH=/opt/blackproof/node/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH

service_directory=/opt/blackproof-release
runtime=/opt/blackproof/node/bin/node
trusted_script="$service_directory/activate-static-release.sh"
snapshot_helper="$service_directory/snapshot-verified-release-components.mjs"
receipt=/run/blackproof-static-release.ready
apache_config=/etc/apache2/sites-available/blackproof.fr.conf
enabled_config=/etc/apache2/sites-enabled/blackproof.fr.conf

if [[ ${EUID:-$(id -u)} -ne 0 || $# -ne 3 ]]; then
  echo 'Usage: activate-static-release.sh CANDIDATE_ROOT EXPECTED_COMMIT EXPECTED_ARTIFACT_SHA256' >&2
  exit 2
fi
candidate_root=$1
expected_commit=$2
expected_digest=$3
if [[ ! "$expected_commit" =~ ^[a-f0-9]{40}$ || ! "$expected_digest" =~ ^[a-f0-9]{64}$ \
  || "$candidate_root" != "/home/bluetouff/blackproof-production-unpacked-$expected_commit" ]]; then
  echo 'Invalid exact-artifact activation arguments.' >&2
  exit 2
fi
if [[ "$(realpath -e -- "${BASH_SOURCE[0]}")" != "$trusted_script" \
  || -L "$service_directory" || "$(stat -c '%U:%G:%a' -- "$service_directory")" != 'root:root:755' ]]; then
  echo 'Activation requires the reviewed root-owned installation.' >&2
  exit 2
fi
for trusted in "$trusted_script" "$snapshot_helper"; do
  [[ -f "$trusted" && ! -L "$trusted" && "$(stat -c '%U:%G' -- "$trusted")" == 'root:root' ]]
  mode=$(stat -c '%a' -- "$trusted")
  (( (8#$mode & 0022) == 0 ))
done
[[ -f "$apache_config" && ! -L "$apache_config" ]]
[[ "$(realpath -e -- "$enabled_config")" == "$apache_config" ]]

# A duplicate BLACKPROOF vhost needs an operator-reviewed migration first.
for enabled in /etc/apache2/sites-enabled/*; do
  [[ "$enabled" == "$enabled_config" ]] && continue
  if grep -Eiq '^[[:space:]]*Server(Name|Alias)[[:space:]].*blackproof\.fr' "$enabled"; then
    echo 'Another enabled BLACKPROOF vhost exists; resolve its exact scope before activation.' >&2
    exit 2
  fi
done

backup_root=/var/backups/blackproof-open-source
install -d -o root -g root -m 0700 "$backup_root"
[[ ! -L "$backup_root" && "$(stat -c '%U:%G:%a' "$backup_root")" == 'root:root:700' ]]
backup=$(mktemp -d "$backup_root/$(date -u +%Y%m%dT%H%M%SZ)-before-$expected_commit.XXXXXX")
snapshot="$backup/components"
install -d -o root -g root -m 0700 "$snapshot"
"$runtime" "$snapshot_helper" "$candidate_root" "$expected_commit" "$expected_digest" "$snapshot" \
  blackproof.fr.conf=artifacts/blackproof.fr.conf \
  promote-static-release.sh=deploy/server/promote-static-release.sh \
  verify-release-directory.mjs=scripts/verify-release-directory.mjs \
  smoke-apache-prod.sh=scripts/smoke-apache-prod.sh
"$runtime" --check "$snapshot/verify-release-directory.mjs"
bash -n "$snapshot/promote-static-release.sh" "$snapshot/smoke-apache-prod.sh"
cp -a -- "$apache_config" "$backup/blackproof.fr.conf"

retired_units=(
  blackproof-license-health.timer blackproof-license-backup.timer
  blackproof-license-restore-check.timer blackproof-license-health.service
  blackproof-license-backup.service blackproof-license-restore-check.service
  blackproof-license.service
)
declare -A was_active was_enabled
for unit in "${retired_units[@]}"; do
  was_active[$unit]=$(systemctl is-active "$unit" 2>/dev/null || true)
  was_enabled[$unit]=$(systemctl is-enabled "$unit" 2>/dev/null || true)
  printf '%s %s %s\n' "$unit" "${was_active[$unit]}" "${was_enabled[$unit]}" >> "$backup/unit-states.txt"
done

rollback() {
  code=$?
  trap - ERR INT TERM
  cp -a -- "$backup/blackproof.fr.conf" "$apache_config"
  apache2ctl configtest && systemctl reload apache2 || true
  for unit in "${retired_units[@]}"; do
    [[ "${was_enabled[$unit]}" != enabled ]] || systemctl enable "$unit" || true
    [[ "${was_active[$unit]}" != active ]] || systemctl start "$unit" || true
  done
  echo "Activation failed. Previous configuration restored; protected rollback copy: $backup" >&2
  exit "$code"
}
trap rollback ERR
trap 'false' INT TERM
for unit in "${retired_units[@]}"; do
  if [[ "$(systemctl show "$unit" -p LoadState --value)" == loaded ]]; then
    systemctl disable --now "$unit"
  fi
done
# These copies are protected historical state, never part of the public artifact.
for protected in /etc/blackproof /var/lib/blackproof-license; do
  if [[ -e "$protected" ]]; then
    [[ -d "$protected" && ! -L "$protected" ]]
    cp -a -- "$protected" "$backup/$(basename "$protected")"
  fi
done
install -o root -g root -m 0644 "$snapshot/blackproof.fr.conf" "$apache_config"
apache2ctl configtest
systemctl reload apache2
retired_http=$(curl --silent --show-error --max-time 15 --output /dev/null --write-out '%{http_code}' https://blackproof.fr/api/license/checkout)
[[ "$retired_http" == 410 ]]
install -o root -g root -m 0755 "$snapshot/promote-static-release.sh" "$service_directory/promote-static-release.sh"
install -o root -g root -m 0644 "$snapshot/verify-release-directory.mjs" "$service_directory/verify-release-directory.mjs"
install -o root -g root -m 0644 "$snapshot/smoke-apache-prod.sh" "$service_directory/smoke-apache-prod.sh"
receipt_tmp=$(mktemp /run/blackproof-static-release.XXXXXX)
printf 'format=1\ncommit=%s\nartifact_sha256=%s\nactivated_at_epoch=%s\n' \
  "$expected_commit" "$expected_digest" "$(date +%s)" > "$receipt_tmp"
chmod 0444 "$receipt_tmp"
mv -T -- "$receipt_tmp" "$receipt"
trap - ERR INT TERM
printf 'BLACKPROOF static hosting prepared for %s. Protected state preserved in %s\n' "$expected_commit" "$backup"
