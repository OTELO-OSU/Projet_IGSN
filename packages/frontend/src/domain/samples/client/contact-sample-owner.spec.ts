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
  it("should post the message to the sample contact endpoint", async () => {
    const { fetch, lastUrl, lastInit } = stubFetch(undefined, 204);

    await contactSampleOwner(igsn, body, fetch);

    expect(new URL(lastUrl() ?? "").pathname).toBe(`/samples/${igsn}/contact`);
    expect(lastInit()?.method).toBe("POST");
    expect(lastInit()?.body).toBe(JSON.stringify(body));
  });

  it("should resolve to sent when the api accepts the message", async () => {
    const { fetch } = stubFetch(undefined, 204);

    await expect(contactSampleOwner(igsn, body, fetch)).resolves.toBe("sent");
  });

  it("should resolve to no_recipient when the owner cannot be contacted", async () => {
    const { fetch } = stubFetch({ error: "No recipient" }, 409);

    await expect(contactSampleOwner(igsn, body, fetch)).resolves.toBe(
      "no_recipient",
    );
  });

  it.each([[400], [404], [500]])(
    "should throw on a %i response",
    async (status) => {
      const { fetch } = stubFetch({ error: "Nope" }, status);

      await expect(contactSampleOwner(igsn, body, fetch)).rejects.toThrow(
        String(status),
      );
    },
  );
});
