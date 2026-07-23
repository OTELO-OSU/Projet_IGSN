#!/usr/bin/env zsh

set -e

GH_CONFIG_PATH="/home/${_CONTAINER_USER}/.config/gh"

mkdir -p "$GH_CONFIG_PATH"

chown -R $_CONTAINER_USER:$_CONTAINER_USER "$GH_CONFIG_PATH"
