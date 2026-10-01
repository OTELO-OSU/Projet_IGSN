# shellcheck shell=bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../../.."

_out() { tofu -chdir=infra/benchmark/tf output -raw "$1"; }

REGION=$(_out aws_region)
SG=$(_out ec2_security_group_id)
HOST=$(_out public_ip)
INSTANCE_ID=$(_out instance_id)
SSH_USER=ec2-user
SSH_PUBLIC_KEY=${SSH_PUBLIC_KEY:-$HOME/.ssh/id_ed25519.pub}
MYIP="$(curl -fsS https://checkip.amazonaws.com)/32"

SSH_OPTS=(
	-i "${SSH_PUBLIC_KEY%.pub}"
	-o StrictHostKeyChecking=accept-new
	-o "UserKnownHostsFile=$HOME/.ssh/igsn-benchmark-$INSTANCE_ID.known_hosts"
	-o ConnectTimeout=15
	-o ServerAliveInterval=30
)

remote() { ssh "${SSH_OPTS[@]}" "$SSH_USER@$HOST" "$@"; }

ssh_open() {
	local err
	err=$(mktemp)
	aws ec2 authorize-security-group-ingress --group-id "$SG" --region "$REGION" \
		--protocol tcp --port 22 --cidr "$MYIP" >/dev/null 2>"$err" ||
		grep -q "InvalidPermission.Duplicate" "$err"
}

ssh_close() {
	aws ec2 describe-security-groups --group-ids "$SG" --region "$REGION" \
		--query "SecurityGroups[0].IpPermissions[?FromPort==\`22\`].IpRanges[].CidrIp" \
		--output text | tr '\t' '\n' | while read -r cidr; do
		[ -n "$cidr" ] || continue
		aws ec2 revoke-security-group-ingress --group-id "$SG" --region "$REGION" \
			--protocol tcp --port 22 --cidr "$cidr" >/dev/null
	done
	echo "Revoked :22 on $SG." >&2
}

ssh_ready() {
	ssh_open
	for _ in $(seq 30); do
		aws ec2-instance-connect send-ssh-public-key --region "$REGION" \
			--instance-id "$INSTANCE_ID" --availability-zone "$(_out availability_zone)" \
			--instance-os-user "$SSH_USER" --ssh-public-key "file://$SSH_PUBLIC_KEY" >/dev/null &&
			remote 'install -d -m 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys &&
				key=$(cat) && { grep -qxF "$key" ~/.ssh/authorized_keys || printf "%s\n" "$key" >>~/.ssh/authorized_keys; }' \
				<"$SSH_PUBLIC_KEY" && return
		sleep 10
	done
	echo "Could not reach $HOST over SSH." >&2
	return 1
}
