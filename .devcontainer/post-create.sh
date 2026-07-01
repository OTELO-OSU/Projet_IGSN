#!/usr/bin/env bash

pnpm add -g typescript-language-server

claude plugin list

# Append git aliases after oh-my-zsh has generated .zshrc (features run after the Dockerfile)
cat >> /home/node/.zshrc <<'EOF'
alias g="git"
alias a="git add -p"
alias s="git status"
alias d="git diff"
EOF
