#!/usr/bin/env bash
set -euo pipefail

[[ -n "${1:-}" ]] && export SSH_PUBLIC_KEY="$1"

source "$(dirname "$0")/common.sh"

ssh_open
trap ssh_close EXIT

aws ec2-instance-connect send-ssh-public-key --region "$REGION" \
	--instance-id "$(_out instance_id)" --availability-zone "$(_out availability_zone)" \
	--instance-os-user "$SSH_USER" --ssh-public-key "file://$SSH_PUBLIC_KEY" >/dev/null

cat "$SSH_PUBLIC_KEY" | ssh $SSH_OPTS "$SSH_USER@$HOST" '
	set -e
	install -d -m 700 ~/.ssh
	touch ~/.ssh/authorized_keys
	chmod 600 ~/.ssh/authorized_keys
	key=$(cat)
	grep -qxF "$key" ~/.ssh/authorized_keys || printf "%s\n" "$key" >> ~/.ssh/authorized_keys
'
echo "Installed $SSH_PUBLIC_KEY on $HOST. Deploys no longer push a key."
