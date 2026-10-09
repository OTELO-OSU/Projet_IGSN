#!/usr/bin/env bash
set -euo pipefail

config="$(mktemp)"
log="$(mktemp)"
trap 'rm -f "$config" "$log"' EXIT

sudo apt-get update -qq
sudo apt-get install -y -qq openfortivpn
printf '%s\n' "host = $VPN_HOST" "username = $VPN_USER" "password = $VPN_PASSWORD" \
	${VPN_PORT:+"port = $VPN_PORT"} ${VPN_TRUSTED_CERT:+"trusted-cert = $VPN_TRUSTED_CERT"} >"$config"
# The tunnel outlives this step: the runner only kills it at the end of the job.
sudo openfortivpn -c "$config" >"$log" 2>&1 &
for _ in $(seq 60); do
	grep -q 'Tunnel is up' "$log" && exit 0
	sleep 1
done
echo "the VPN tunnel did not come up within 60 s:" >&2
cat "$log" >&2
exit 1
