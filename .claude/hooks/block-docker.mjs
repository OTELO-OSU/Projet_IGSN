#!/usr/bin/env node
// PreToolUse hook: blocks Bash commands that start a Docker container or exec
// a command inside one. This protects the devcontainer sandbox from being
// bypassed (e.g. `docker run --privileged -v /:/host ...`).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Subcommands that start a container or run a command inside one. We match them
// as whole tokens *anywhere* after a `docker`/`docker-compose` token (until the
// next command separator), so intervening flags cannot slip past the guard
// (`docker compose -f x.yml up`, `docker --context c run`, `sudo docker exec`).
const DANGEROUS = new Set(["run", "start", "exec", "up"]);

export function startsContainer(command) {
  const tokens = command.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] !== "docker" && tokens[i] !== "docker-compose") continue;
    for (let j = i + 1; j < tokens.length; j++) {
      if (/[;&|]/.test(tokens[j])) break; // next command segment: stop scanning
      if (DANGEROUS.has(tokens[j])) return true;
    }
  }
  return false;
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    // If we cannot parse the payload, fail open so we never wedge the session.
    process.exit(0);
  }

  const command = input?.tool_input?.command;
  if (typeof command !== "string") process.exit(0);

  if (startsContainer(command)) {
    deny(
      "Blocked by project hook: docker commands that start a container " +
        "(run/start/up) or exec a command inside one (exec/run) are not allowed. " +
        "Use `make` targets or run the command outside the agent if intended.",
    );
  }

  process.exit(0);
}

// Only read stdin when run as the hook, not when imported by the test.
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
