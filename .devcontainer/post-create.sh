#!/usr/bin/env bash

pnpm add -g typescript-language-server

# On a fresh ~/.claude volume the marketplaces/plugins declared in
# .claude/settings.json aren't downloaded yet. Fetch and install them so they
# are enabled on first container start.
claude plugin marketplace update
claude plugin install ponytail@ponytail
claude plugin install superpowers@claude-plugins-official
claude plugin install typescript-lsp@claude-plugins-official

# Append git aliases after oh-my-zsh has generated .zshrc (features run after the Dockerfile)
cat >> /home/node/.zshrc <<'EOF'
alias g="git"
alias a="git add -p"
alias s="git status"
alias d="git diff"
EOF
