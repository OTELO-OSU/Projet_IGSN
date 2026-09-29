import type { DataCiteConfig } from "./config.ts";

const PROBE_TIMEOUT_MS = 5_000;

export async function checkDataCite(
  config: DataCiteConfig | null,
): Promise<boolean> {
  if (!config) return true;
  try {
    const response = await fetch(`${config.host}/dois?page[size]=1`, {
      headers: { Authorization: `Bearer ${config.key}` },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}
