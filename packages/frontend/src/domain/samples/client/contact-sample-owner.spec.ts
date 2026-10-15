import { contactSampleOwner } from "#/domain/samples/client/contact-sample-owner.ts";

import { stubFetch } from "../../../../test/stub-fetch.ts";

const igsn = "0123456789ABCDEFGHJKMNPQRS";

const body = {
  name: "Lovelace",
  firstname: "Ada",
  email: "ada@example.org",
  message: "Could I see this sample?",
};

describe("contactSampleOwner", () => {
  it.each([
    ["owner", `/api/samples/${igsn}/contact`],
    ["archive", `/api/samples/${igsn}/contact/archive`],
  ] as const)(
    "should post the message for the %s to %s",
    async (recipient, pathname) => {
      const { fetch, lastUrl, lastInit } = stubFetch(undefined, 204);

      await contactSampleOwner(igsn, recipient, body, fetch);

      expect(new URL(lastUrl() ?? "").pathname).toBe(pathname);
      expect(lastInit()?.method).toBe("POST");
      expect(lastInit()?.body).toBe(JSON.stringify(body));
    },
  );

  it.each([
    [204, "sent"],
    [409, "no_recipient"],
    [429, "rate_limited"],
  ])("should resolve a %i response to %s", async (status, result) => {
    const { fetch } = stubFetch(undefined, status);

    await expect(contactSampleOwner(igsn, "owner", body, fetch)).resolves.toBe(
      result,
    );
  });

  it.each([[400], [404], [500]])(
    "should throw on a %i response",
    async (status) => {
      const { fetch } = stubFetch({ error: "Nope" }, status);

      await expect(
        contactSampleOwner(igsn, "owner", body, fetch),
      ).rejects.toThrow(String(status));
    },
  );
});
