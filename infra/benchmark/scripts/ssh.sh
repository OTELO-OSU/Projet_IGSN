#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"

trap ssh_close EXIT
ssh_ready
remote "$@"
