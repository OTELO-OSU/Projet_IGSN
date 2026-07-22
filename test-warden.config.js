// test-warden.config.js — REQUIRED: how test-warden runs this project's tests.
// The server reads and validates this on startup and refuses to start if it is
// missing or invalid. Edit freely — `init` never overwrites it; regenerate from
// scratch with `npx test-warden bootstrap` (overwrites, warns).
//
// One entry per package/workspace whose tests can be run. Keys:
//   dir:    directory to run tests in, relative to this file (default ".").
//           Monorepo: add one entry per package, e.g. "packages/api".
//   runner: "jest" | "vitest" (required — the only supported runners).
//   args:   extra CLI flags appended to every run, e.g. "--config jest.custom.js"
//           (default "").
//   env:    env vars (string values) set for the runner, e.g. { "TZ": "UTC" }.
//           Inline vars from the package's `test` script are pre-filled; add
//           anything a .env file or CI would normally provide (default {}).
//   bin:    optional path to the runner binary, relative to this file, e.g.
//           "tools/vitest-wrapper". Default: nearest node_modules/.bin/<runner>
//           walking up from `dir` (hoisted monorepo installs resolve).
// No other keys are allowed (validation rejects typos).
module.exports = [
  {
    dir: ".",
    runner: "vitest",
    args: "",
    env: {},
  },
];
