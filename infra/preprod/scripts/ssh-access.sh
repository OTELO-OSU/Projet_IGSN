#!/usr/bin/env bash
# Temporary SSH access to the preprod host: opens the security group's :22 to
# your current public IP. Assumes your key is already installed (run
# `make preprod-ssh-send-key` once); your private key never leaves your laptop.
#
#   infra/preprod/scripts/ssh-access.sh connect  # open, ssh in, revoke on exit  (make preprod-ssh)
#   infra/preprod/scripts/ssh-access.sh grant    # open :22, then: ssh ec2-user@<eip>
#   infra/preprod/scripts/ssh-access.sh revoke   # close :22 again
set -euo pipefail

source "$(dirname "$0")/common.sh"

case "${1:-}" in
connect)
	ssh_open
	trap ssh_close EXIT
	ssh $SSH_OPTS "$SSH_USER@$HOST"
	;;
grant)
	ssh_open
	echo "Opened :22 to $MYIP. Connect with your installed key:"
	echo "  ssh ${SSH_USER}@${HOST}"
	echo "When done: infra/preprod/scripts/ssh-access.sh revoke"
	;;
revoke)
	ssh_close
	echo "Revoked :22 for $MYIP."
	;;
*)
	echo "usage: $0 <connect|grant|revoke>" >&2
	exit 1
	;;
esac
