# 9. Chromium-only component tests

Date: 2026-07-07

## Status

Accepted

## Context

Component tests run in Vitest browser mode (Playwright provider) and drove two
instances per package: chromium and firefox. The firefox instance was flaky:
under full-suite parallel load, headless Firefox intermittently drops trusted
input events (a click or keypress lands nowhere) and sometimes stalls a whole
test page. Assertions auto-retry but the one-shot user action does not, so the
test times out.

Three workarounds accumulated to paper over this: a global `retry: 2`, a
keyboard-driven Radix Select workaround in the pagination spec, and the
`position="popper"` select default. The suite still flaked (roughly one run in
ten), and `retry: 2` masked real failures: a run could fail with every test
reported as passing.

## Decision

Run Vitest browser-mode tests on chromium only, in every package. Remove the
`retry` mask and the keyboard workaround; tests drive components the way a
user does (pointer clicks) and rely on retrying assertions.

## Consequences

- Component tests are deterministic; a failure means a regression, not the
  environment.
- The suite runs half the tests, so it is about twice as fast.
- No automated Firefox coverage for components. Component tests assert domain
  behavior, not rendering engines, so the loss is small. If a Firefox-specific
  bug ever ships, add a Playwright e2e journey for it rather than reinstating
  the flaky matrix.
