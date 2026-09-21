import { vi } from "vitest";

/** Points publishSample at a fake DataCite answering `response`; undo with vi.unstubAllGlobals(). */
export function stubDataCite(response: Response) {
  process.env.DATACITE_API_HOST = "http://datacite.test";
  process.env.DATACITE_API_KEY = "topsecret";
  process.env.DATACITE_DOI_PREFIX = "10.5072";
  process.env.FRONTEND_URL = "http://localhost:3000";
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
