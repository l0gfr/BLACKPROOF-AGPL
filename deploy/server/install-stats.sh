#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

script_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
project_directory=$(cd -- "$script_directory/../.." && pwd)

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "This script must run as root" >&2
  exit 2
fi

test -f "$project_directory/deploy/server/generate-stats.sh"
test -f "$project_directory/deploy/systemd/blackproof-stats.service.example"
test -f "$project_directory/deploy/systemd/blackproof-stats.timer.example"

apt-get update
apt-get install -y --no-install-recommends apache2-utils goaccess gzip
a2enmod auth_basic authn_file headers alias

goaccess_help=$(/usr/bin/goaccess --help 2>&1 || true)
for required_option in --anonymize-level --no-query-string --keep-last --external-assets; do
  if [[ "$goaccess_help" != *"$required_option"* ]]; then
    echo "The installed GoAccess version does not support $required_option" >&2
    exit 2
  fi
done

if ! getent group blackproof-stats >/dev/null 2>&1; then
  groupadd --system blackproof-stats
fi
if ! id blackproof-stats >/dev/null 2>&1; then
  useradd --system --gid blackproof-stats --home-dir /var/lib/blackproof-stats --create-home \
    --shell /usr/sbin/nologin --groups adm blackproof-stats
fi
usermod --append --groups adm blackproof-stats

install -d -o blackproof-stats -g www-data -m 2750 /var/www/html/blackproof-stats
install -o root -g root -m 755 "$project_directory/deploy/server/generate-stats.sh" \
  /usr/local/libexec/blackproof-generate-stats
install -o root -g root -m 644 "$project_directory/deploy/systemd/blackproof-stats.service.example" \
  /etc/systemd/system/blackproof-stats.service
install -o root -g root -m 644 "$project_directory/deploy/systemd/blackproof-stats.timer.example" \
  /etc/systemd/system/blackproof-stats.timer

stats_user=""
while [[ ! "$stats_user" =~ ^[A-Za-z0-9._-]{1,64}$ ]]; do
  read -r -p "Stats username [bluetouff]: " stats_user
  stats_user=${stats_user:-bluetouff}
done

password=""
confirmation=""
while [[ ${#password} -lt 16 || "$password" != "$confirmation" ]]; do
  read -r -s -p "Stats password, 16 characters minimum: " password
  echo
  read -r -s -p "Confirm stats password: " confirmation
  echo
  if [[ ${#password} -lt 16 ]]; then
    echo "Password is too short" >&2
  elif [[ "$password" != "$confirmation" ]]; then
    echo "Passwords do not match" >&2
  fi
done

htpasswd_file="/etc/apache2/blackproof-stats.htpasswd"
if [[ -f "$htpasswd_file" ]]; then
  printf '%s\n' "$password" | htpasswd -i -B -C 12 "$htpasswd_file" "$stats_user"
else
  printf '%s\n' "$password" | htpasswd -i -B -C 12 -c "$htpasswd_file" "$stats_user"
fi
unset password confirmation
chown root:www-data "$htpasswd_file"
chmod 640 "$htpasswd_file"

systemctl daemon-reload
systemctl enable --now blackproof-stats.timer
systemctl start blackproof-stats.service

test -s /var/www/html/blackproof-stats/index.html
test -s /var/www/html/blackproof-stats/goaccess.css
test -s /var/www/html/blackproof-stats/goaccess.js

echo "BLACKPROOF statistics runtime installed."
echo "Install the rendered Apache vhost, reload Apache, then verify https://blackproof.fr/stats/."
