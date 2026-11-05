#!/usr/bin/env bash
# Provision the POC: org instance acme (owns the shared drives), alice and bob.
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a
D=100-86-182-33.nip.io
P=4600
ADMIN="http://127.0.0.1:4601"
AUTH="admin:${COZY_ADMIN_PASSPHRASE:?}"
stackx() { docker compose exec -T cozystack cozy-stack --admin-port 4601 "$@"; }

for u in acme alice bob; do
  if curl -sf -u "$AUTH" "$ADMIN/instances/$u.$D:$P" >/dev/null; then echo "reuse $u"; continue; fi
  curl -sf -u "$AUTH" -X POST "$ADMIN/instances?Domain=$u.$D:$P&Email=$u@$D&Locale=fr&Passphrase=${POC_PASSPHRASE:?}&PublicName=${u^}&ContextName=default&OrgID=acme&OrgDomain=$D" >/dev/null
  echo "created $u"
done

for u in acme alice bob; do
  stackx features flags --domain "$u.$D:$P" '{"drive.shared-drive.enabled":true,"drive.federated-shared-folder.enabled":true,"cozy.hide-sharing-cozy-to-cozy":true}' >/dev/null
done

# acme knows alice and bob as contacts (deterministic ids, idempotent).
CT=$(stackx instances token-cli "acme.$D:$P" io.cozy.contacts)
for u in alice bob; do
  curl -s -o /dev/null -X PUT "http://acme.$D:$P/data/io.cozy.contacts/contact-$u" \
    --resolve "acme.$D:$P:100.86.182.33" -H "Authorization: Bearer $CT" -H 'Content-Type: application/json' \
    -d "{\"fullname\":\"${u^}\",\"email\":[{\"address\":\"$u@$D\",\"primary\":true}],\"cozy\":[{\"url\":\"http://$u.$D:$P\",\"primary\":true}]}"
done

ST=$(stackx instances token-cli "acme.$D:$P" io.cozy.sharings io.cozy.files)
existing=$(curl -s "http://acme.$D:$P/sharings/drives" -H "Authorization: Bearer $ST")
mkdrive() { # name, rw recipients json, ro recipients json
  if grep -q "\"description\":\"$1\"" <<<"$existing"; then echo "reuse drive $1"; return; fi
  curl -sf -X POST "http://acme.$D:$P/sharings/drives" -H "Authorization: Bearer $ST" \
    -H 'Content-Type: application/vnd.api+json' -H 'Accept: application/vnd.api+json' \
    -d "{\"data\":{\"type\":\"io.cozy.sharings\",\"attributes\":{\"name\":\"$1\"},\"relationships\":{\"recipients\":{\"data\":$2},\"read_only_recipients\":{\"data\":$3}}}}" >/dev/null
  echo "created drive $1"
}
A='{"id":"contact-alice","type":"io.cozy.contacts"}'
B='{"id":"contact-bob","type":"io.cozy.contacts"}'
mkdrive "Projet" "[$A,$B]" "[]"
mkdrive "Annonces" "[$A]" "[$B]"
