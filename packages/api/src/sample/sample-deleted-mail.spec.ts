import { describe, expect, it } from "vitest";

import { sampleDeletedMail } from "./sample-deleted-mail.ts";

const ADMIN_URL = "http://localhost:3001/admin/";

const deletion = {
  recipient: {
    email: "marie.dupont@univ-lorraine.fr",
    name: "Dupont",
    firstname: "Marie",
  },
  deleter: {
    email: "jean.martin@univ-lorraine.fr",
    name: "Martin",
    firstname: "Jean",
  },
  sampleName: "Basalt core 12",
  url: ADMIN_URL,
};

describe("sampleDeletedMail", () => {
  it("should name the deleter and the sample, and link the sample list", async () => {
    const mail = await sampleDeletedMail(deletion);

    expect(mail.subject).toBe(
      'Jean Martin deleted the draft sample "Basalt core 12"',
    );
    expect(mail.text).toBe(
      `Hello Marie Dupont,

Jean Martin deleted the draft sample "Basalt core 12" you collaborated on. Its information is no longer available.

Open my samples: ${ADMIN_URL}
`,
    );
    expect(mail.html).toContain("Jean Martin");
    expect(mail.html).toContain("Basalt core 12");
    expect(mail.html).toContain(ADMIN_URL);
  });

  it("should fall back to the deleter's email when they have no name", async () => {
    const mail = await sampleDeletedMail({
      ...deletion,
      deleter: {
        email: "jean.martin@univ-lorraine.fr",
        name: null,
        firstname: null,
      },
    });

    expect(mail.subject).toBe(
      'jean.martin@univ-lorraine.fr deleted the draft sample "Basalt core 12"',
    );
    expect(mail.text).toContain("jean.martin@univ-lorraine.fr deleted");
  });
});
