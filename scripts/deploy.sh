#!/usr/bin/env bash
set -euo pipefail
: "${STRATO_SFTP_HOST:?STRATO_SFTP_HOST fehlt}"
: "${STRATO_SFTP_USER:?STRATO_SFTP_USER fehlt}"
: "${STRATO_SFTP_PASSWORD:?STRATO_SFTP_PASSWORD fehlt}"
: "${STRATO_SFTP_KNOWN_HOSTS:?Der geprüfte STRATO-Hostschlüssel fehlt}"
: "${STRATO_SFTP_TARGET:?Der Zielordner für Julia Kochstudio fehlt}"

if [[ ! "$STRATO_SFTP_HOST" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*$ || ! "$STRATO_SFTP_USER" =~ ^[A-Za-z0-9][A-Za-z0-9@._-]*$ ]]; then
  echo "Bitte SFTP-Host und Benutzernamen im Repository prüfen." >&2
  exit 1
fi
if [[ ! "$STRATO_SFTP_TARGET" =~ ^/([A-Za-z0-9_-]+/)*kochen/web$ && "$STRATO_SFTP_TARGET" != /web ]]; then
  echo "Der Zielpfad muss auf /kochen/web enden. Bei einem im Kochbuch-Ordner startenden Zugang gilt /web." >&2
  exit 1
fi
for file in index.html kochbuch.js kochbuch.css; do
  test -s "dist/$file" || { echo "Bitte zuerst npm run build ausführen." >&2; exit 1; }
done
ssh_dir=$(mktemp -d)
trap 'rm -rf "$ssh_dir"' EXIT
printf '%s\n' "$STRATO_SFTP_KNOWN_HOSTS" > "$ssh_dir/known_hosts"
chmod 600 "$ssh_dir/known_hosts"
ssh-keygen -F "$STRATO_SFTP_HOST" -f "$ssh_dir/known_hosts" >/dev/null || {
  echo "Der hinterlegte Hostschlüssel passt nicht zum angegebenen Servernamen." >&2
  exit 1
}
export LFTP_PASSWORD="$STRATO_SFTP_PASSWORD"
lftp --norc -f /dev/stdin <<LFTP
set cmd:fail-exit yes
set net:max-retries 2
set net:timeout 20
set xfer:use-temp-file yes
set sftp:connect-program "ssh -a -x -oStrictHostKeyChecking=yes -oUserKnownHostsFile=$ssh_dir/known_hosts -oGlobalKnownHostsFile=/dev/null"
open --env-password --user "$STRATO_SFTP_USER" "sftp://$STRATO_SFTP_HOST:22"
cd "$STRATO_SFTP_TARGET"
mirror --reverse --transfer-all --no-perms --parallel=2 dist/ .
bye
LFTP
