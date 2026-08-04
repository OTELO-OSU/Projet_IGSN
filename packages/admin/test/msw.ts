import { setupWorker } from "msw/browser";

// Shared MSW worker, started once per spec file (see setup.ts). It starts with
// no routes: each test registers its full route set with worker.use(...).
// Handlers are deliberately never reset: use() prepends, so the current test's
// handlers shadow earlier ones, and a reset would leave a no-handler window
// where late requests from the previous test warn as unhandled.
export const worker = setupWorker();
