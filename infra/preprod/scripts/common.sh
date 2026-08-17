# shellcheck shell=bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../../.."

_out() { tofu -chdir=infra/preprod/tf output -raw "$1"; }

REGION=$(_out aws_region)
SG=$(_out ec2_security_group_id)
HOST=$(_out public_ip)
SSH_USER=ec2-user
SSH_PUBLIC_KEY=${SSH_PUBLIC_KEY:-$HOME/.ssh/id_ed25519.pub}
MYIP="$(curl -fsS https://checkip.amazonaws.com)/32"

SSH_OPTS="-i ${SSH_PUBLIC_KEY%.pub} -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15"

ssh_open() {
	aws ec2 authorize-security-group-ingress --group-id "$SG" --region "$REGION" \
		--protocol tcp --port 22 --cidr "$MYIP" >/dev/null 2>/tmp/ssh_open.err ||
		grep -q "InvalidPermission.Duplicate" /tmp/ssh_open.err
}

ssh_close() {
	aws ec2 describe-security-groups --group-ids "$SG" --region "$REGION" \
		--query "SecurityGroups[0].IpPermissions[?FromPort==\`22\`].IpRanges[].CidrIp" \
		--output text | tr '\t' '\n' | while read -r cidr; do
		[ -n "$cidr" ] || continue
		aws ec2 revoke-security-group-ingress --group-id "$SG" --region "$REGION" \
			--protocol tcp --port 22 --cidr "$cidr" >/dev/null
	done
}
