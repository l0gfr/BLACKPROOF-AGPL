#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

log_directory="/var/log/apache2"
active_log="$log_directory/blackproof-access.log"
output_directory="/var/www/html/blackproof-stats"
temporary_directory=$(mktemp -d "$output_directory/.build.XXXXXX")

cleanup() {
  rm -f -- \
    "$temporary_directory/index.html" \
    "$temporary_directory/goaccess.css" \
    "$temporary_directory/goaccess.js"
  rmdir -- "$temporary_directory" 2>/dev/null || true
}
trap cleanup EXIT

test -r "$active_log"
test -d "$output_directory"

mapfile -t compressed_logs < <(
  find "$log_directory" -maxdepth 1 -type f -name 'blackproof-access.log.*.gz' -print | sort -V -r
)

{
  for log_file in "${compressed_logs[@]}"; do
    gzip --decompress --stdout -- "$log_file"
  done
  if [[ -r "$active_log.1" ]]; then
    cat -- "$active_log.1"
  fi
  cat -- "$active_log"
} | /usr/bin/goaccess - \
  --no-global-config \
  --log-format=COMBINED \
  --anonymize-ip \
  --anonymize-level=2 \
  --no-query-string \
  --keep-last=14 \
  --external-assets \
  --html-report-title='BLACKPROOF, statistiques privees des 14 derniers jours' \
  --html-prefs='{"theme":"darkPurple","perPage":20,"layout":"vertical","showTables":true}' \
  --tz=Europe/Paris \
  --no-progress \
  --no-parsing-spinner \
  --output="$temporary_directory/index.html"

chmod 640 \
  "$temporary_directory/index.html" \
  "$temporary_directory/goaccess.css" \
  "$temporary_directory/goaccess.js"

# Publish assets first and the report last so index.html never references a
# partially written asset. Every rename stays on the same filesystem.
mv -f -- "$temporary_directory/goaccess.css" "$output_directory/goaccess.css"
mv -f -- "$temporary_directory/goaccess.js" "$output_directory/goaccess.js"
mv -f -- "$temporary_directory/index.html" "$output_directory/index.html"

rmdir -- "$temporary_directory"
trap - EXIT
