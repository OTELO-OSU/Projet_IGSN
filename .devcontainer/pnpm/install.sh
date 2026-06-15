#!/usr/bin/env bash

set -e

npm install -g pnpm@11.7.0

NODE_MODULES_PATH="/workspaces/projet-igsn/node_modules"
mkdir -p "$NODE_MODULES_PATH" && chown -R $_CONTAINER_USER:$_CONTAINER_USER "$NODE_MODULES_PATH"

PNPM_HOME="/mnt/pnpm"
PNPM_BIN_PATH="$PNPM_HOME/bin"

mkdir -p "$PNPM_BIN_PATH" && chown -R $_CONTAINER_USER:$_CONTAINER_USER "$PNPM_HOME"
echo "export PNPM_HOME=\"$PNPM_HOME\"" >> /home/$_CONTAINER_USER/.bashrc
echo "export PATH=\$PATH:\"$PNPM_BIN_PATH\"" >> /home/$_CONTAINER_USER/.bashrc
