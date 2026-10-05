import { describe, expect, it } from "vitest";

import { RESEARCH_PROJECT_SAMPLE_RECORD } from "../sample/core/core-record-fixture.ts";
import { sampleBatchBodySchema } from "./model.ts";

const items = [{ partnerId: "p-1", sample: RESEARCH_PROJECT_SAMPLE_RECORD }];
const url = "https://partner.example.org/hooks/igsn";
const secret = "a-partner-shared-secret";

const parses = (body: unknown) => sampleBatchBodySchema.safeParse(body).success;

describe("sampleBatchBodySchema", () => {
  it.each([
    ["no webhook", { items }],
    ["a webhook url and secret", { items, webhook: { url, secret } }],
    [
      "an http url, left to the api's dev hosts",
      { items, webhook: { url: "http://webhook-sink:8080/", secret } },
    ],
    [
      "a 16 character secret",
      { items, webhook: { url, secret: "s".repeat(16) } },
    ],
    [
      "a 255 character secret",
      { items, webhook: { url, secret: "s".repeat(255) } },
    ],
  ])("should accept a body with %s", (_case, body) => {
    expect(parses(body)).toBe(true);
  });

  it.each([
    ["a bare array of items", items],
    [
      "an ftp url",
      { items, webhook: { url: "ftp://partner.example.org/hooks", secret } },
    ],
    [
      "a url carrying credentials",
      {
        items,
        webhook: { url: "https://u:p@partner.example.org/hooks", secret },
      },
    ],
    [
      "a url over 2048 characters",
      {
        items,
        webhook: {
          url: `https://partner.example.org/${"a".repeat(2049 - 28)}`,
          secret,
        },
      },
    ],
    ["a webhook url without secret", { items, webhook: { url } }],
    [
      "a 15 character secret",
      { items, webhook: { url, secret: "s".repeat(15) } },
    ],
    [
      "a 256 character secret",
      { items, webhook: { url, secret: "s".repeat(256) } },
    ],
    [
      "an unknown webhook key",
      { items, webhook: { url, secret, method: "PUT" } },
    ],
    ["an unknown top-level key", { items, callback: url }],
  ])("should refuse %s", (_case, body) => {
    expect(parses(body)).toBe(false);
  });
});
