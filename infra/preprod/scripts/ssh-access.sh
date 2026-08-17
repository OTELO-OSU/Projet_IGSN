#!/usr/bin/env bash
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
