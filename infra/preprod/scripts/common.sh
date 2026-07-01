# shellcheck shell=bash
# Shared helpers for the deploy scripts. Sourced, never executed. Reads infra
# outputs and defines the SSH-access helpers used by ssh-access.sh and
# deploy.sh. Sets the working directory to the repo root so relative paths
# (docker build context, `tofu -chdir=infra/preprod/tf`) resolve.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../../.." # repo root

_out() { tofu -chdir=infra/preprod/tf output -raw "$1"; }

REGION=$(_out aws_region)
SG=$(_out ec2_security_group_id)
HOST=$(_out public_ip)
SSH_USER=ec2-user # AL2023 default
SSH_PUBLIC_KEY=${SSH_PUBLIC_KEY:-$HOME/.ssh/id_ed25519.pub}
MYIP="$(curl -fsS https://checkip.amazonaws.com)/32"

SSH_OPTS="-i ${SSH_PUBLIC_KEY%.pub} -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15"

# Open :22 for your current IP. Ignore only a duplicate-rule error (already
# open); any other failure surfaces so we do not think access opened when it did
# not.
ssh_open() {
	aws ec2 authorize-security-group-ingress --group-id "$SG" --region "$REGION" \
		--protocol tcp --port 22 --cidr "$MYIP" >/dev/null 2>/tmp/ssh_open.err ||
		grep -q "InvalidPermission.Duplicate" /tmp/ssh_open.err
}

# Close :22 by revoking every :22 ingress rule on the SG, not just this run's
# MYIP. These scripts are the only thing that ever opens :22 (tofu opens 80/443
# only), so sweeping is safe and clears orphans left by an IP change between
# grant/revoke or a trap that never fired (kill -9, sleep). Failures are NOT
# swallowed: a rule we believe closed staying open is exactly what we must catch.
ssh_close() {
	aws ec2 describe-security-groups --group-ids "$SG" --region "$REGION" \
		--query "SecurityGroups[0].IpPermissions[?FromPort==\`22\`].IpRanges[].CidrIp" \
		--output text | tr '\t' '\n' | while read -r cidr; do
		[ -n "$cidr" ] || continue
		aws ec2 revoke-security-group-ingress --group-id "$SG" --region "$REGION" \
			--protocol tcp --port 22 --cidr "$cidr" >/dev/null
	done
}
