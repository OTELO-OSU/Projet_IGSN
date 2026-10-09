import type { Kysely } from "kysely";

import { vi } from "vitest";

import type { DB } from "../db.ts";

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

export const dataCiteEventsOf = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.map(
    ([, init]) => JSON.parse(init.body).data.attributes.event,
  );

type RelatedIdentifier = { relationType: string; relatedIdentifier: string };

export const hasPartPutsOf = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.flatMap(([url, init]) => {
    if (init?.method !== "PUT") return [];
    const { relatedIdentifiers } = JSON.parse(init.body).data.attributes as {
      relatedIdentifiers: RelatedIdentifier[];
    };
    return [
      {
        url,
        hasPart: relatedIdentifiers
          .filter(({ relationType }) => relationType === "HasPart")
          .map(({ relatedIdentifier }) => relatedIdentifier),
      },
    ];
  });

export const doiUrlOf = (igsn: string | null) =>
  `${STUB_DATACITE_CONFIG.host}/dois/${STUB_DATACITE_CONFIG.prefix}/${igsn}`;

export const registerDois = (db: Kysely<DB>, ids: string[]) =>
  db
    .updateTable("sample")
    .set({ doi_prefix: STUB_DATACITE_CONFIG.prefix })
    .where("id", "in", ids)
    .execute();
