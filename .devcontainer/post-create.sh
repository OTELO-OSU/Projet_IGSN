#!/usr/bin/env bash

pnpm add -g typescript-language-server

claude plugin marketplace add anthropics/claude-plugins-official
claude plugin marketplace update claude-plugins-official
claude plugin install typescript-lsp
