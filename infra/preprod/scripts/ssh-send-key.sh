#!/usr/bin/env bash
# Install your SSH public key into the preprod host's authorized_keys, once, so
# deploys can connect without pushing an ephemeral key each time. Bootstraps the
# first connection via ec2-instance-connect (~60s), then appends the key
# idempotently. Re-run after changing keys.
#
#   make preprod-ssh-send-key                                     # ~/.ssh/id_ed25519.pub
#   make preprod-ssh-send-key SSH_PUBLIC_KEY_PATH=~/.ssh/other.pub
#   infra/preprod/scripts/ssh-send-key.sh [public-key-path]
set -euo pipefail

# Optional public-key path arg, overriding the common.sh default. Set before
# sourcing so SSH_OPTS uses the matching private key too.
[[ -n "${1:-}" ]] && export SSH_PUBLIC_KEY="$1"

source "$(dirname "$0")/common.sh"

ssh_open
trap ssh_close EXIT

# Bootstrap: push an ephemeral key via ec2-instance-connect (~60s) just to get
# in this once. This is the only script that needs it; every other script uses
# the key installed below.
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
