import { describe, expect, it } from "vitest";

import { sampleEmbargoMail } from "./sample-embargo-mail.ts";

const SAMPLE_URL = "http://localhost:3001/admin/samples/0190";

const embargo = {
  recipient: {
    email: "marie.dupont@univ-lorraine.fr",
    name: "Dupont",
    firstname: "Marie",
  },
  actor: {
    email: "jean.martin@univ-lorraine.fr",
    name: "Martin",
    firstname: "Jean",
  },
  sampleName: "Basalt core 12",
  publishedAt: new Date("2027-03-15T00:00:00.000Z"),
  url: SAMPLE_URL,
};

describe("sampleEmbargoMail", () => {
  it("should name the publisher, the sample and the publication date when the embargo starts", async () => {
    const mail = await sampleEmbargoMail({ ...embargo, event: "started" });

    expect(mail.subject).toBe(
      'Jean Martin published the sample "Basalt core 12" with an embargo until 2027-03-15',
    );
    expect(mail.text).toBe(
      `Hello Marie Dupont,

Jean Martin published the sample "Basalt core 12" you collaborate on with an embargo. It now carries an IGSN and its main information can no longer be changed. It stays private and becomes public on 2027-03-15.

Open the sample: ${SAMPLE_URL}
`,
    );
  });

  it("should name the sample when the embargo ends", async () => {
    const mail = await sampleEmbargoMail({
      ...embargo,
      actor: undefined,
      event: "ended",
    });

    expect(mail.subject).toBe('The sample "Basalt core 12" is now published');
    expect(mail.text).toBe(
      `Hello Marie Dupont,

The embargo on the sample "Basalt core 12" you collaborate on has ended. It is now publicly visible with its IGSN.

Open the sample: ${SAMPLE_URL}
`,
    );
  });
});
