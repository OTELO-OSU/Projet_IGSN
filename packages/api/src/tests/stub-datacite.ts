import { vi } from "vitest";

export const STUB_DATACITE_CONFIG = {
  host: "http://datacite.test",
  key: "topsecret",
  prefix: "10.5072",
};

/** Sets the DataCite env for createApp and fakes DataCite answering `response`; undo with vi.unstubAllGlobals(). */
export function stubDataCite(response: Response) {
  process.env.DATACITE_API_HOST = STUB_DATACITE_CONFIG.host;
  process.env.DATACITE_API_KEY = STUB_DATACITE_CONFIG.key;
  process.env.DATACITE_DOI_PREFIX = STUB_DATACITE_CONFIG.prefix;
  process.env.FRONTEND_URL = "http://localhost:3000";
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
