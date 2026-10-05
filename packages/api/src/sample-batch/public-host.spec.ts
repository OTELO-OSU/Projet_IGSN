import { afterEach, describe, expect, it, vi } from "vitest";

import { isPublicAddress, publicLookup, webhookTarget } from "./public-host.ts";

describe("isPublicAddress", () => {
  it.each([
    "10.0.0.1",
    "127.0.0.1",
    "100.100.100.200",
    "::1",
    "::ffff:127.0.0.1",
    "64:ff9b::7f00:1",
  ])("should refuse %s", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(["193.50.111.10", "2001:660:4701::1"])(
    "should allow %s",
    (address) => {
      expect(isPublicAddress(address)).toBe(true);
    },
  );
});

describe("webhookTarget", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    [
      "https to a public name, through the address guard",
      "https://partner.example.org/hook",
      "",
      publicLookup,
    ],
    [
      "https to a public address, through the address guard",
      "https://193.50.111.10/hook",
      "",
      publicLookup,
    ],
    [
      "http to a dev host listed with spaces and capitals, past the address guard",
      "http://webhook-sink:8080/",
      " Webhook-Sink , localhost",
      undefined,
    ],
  ])("should accept %s", (_rule, url, devHosts, lookup) => {
    vi.stubEnv("WEBHOOK_DEV_HOSTS", devHosts);
    expect(webhookTarget(url)).toEqual({ url: new URL(url), lookup });
  });

  it.each([
    ["http to another host", "http://partner.example.org/hook", "webhook-sink"],
    ["http with no dev host", "http://webhook-sink:8080/", ""],
    ["https to a private address", "https://10.0.0.5/hook", ""],
    ["https to a loopback v6 address", "https://[::1]/hook", ""],
  ])("should refuse %s", (_rule, url, devHosts) => {
    vi.stubEnv("WEBHOOK_DEV_HOSTS", devHosts);
    expect(webhookTarget(url)).toBeNull();
  });
});
