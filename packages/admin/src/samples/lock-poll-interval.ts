const DEFAULT_POLL_SECONDS = 30;

export const LOCK_POLL_INTERVAL_MS: number =
  (Number(import.meta.env.VITE_SAMPLE_LOCK_POLL_SECONDS) ||
    DEFAULT_POLL_SECONDS) * 1000;
