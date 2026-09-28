#!/usr/bin/env zsh

pnpm add -g typescript-language-server

# Used by playwright MCP, cannot use chromium here
pnpm playwright install chrome

# On a fresh ~/.claude volume the marketplaces/plugins declared in
# .claude/settings.json aren't downloaded yet.
claude plugin marketplace update
claude plugin install ponytail@ponytail
claude plugin install typescript-lsp@claude-plugins-official

# Append git aliases after oh-my-zsh has generated .zshrc (features run after the Dockerfile)
cat >> /home/node/.zshrc <<'EOF'
alias g="git"
alias a="git add -p"
alias s="git status"
alias d="git diff"
EOF
