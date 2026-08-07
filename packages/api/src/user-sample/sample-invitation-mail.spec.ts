import { describe, expect, it } from "vitest";

import { sampleInvitationMail } from "./sample-invitation-mail.ts";

const SAMPLE_URL =
  "http://localhost:3001/samples/01890a5d-ac96-774b-bcce-b302099a8057";

const invitation = {
  invitee: {
    email: "marie.dupont@univ-lorraine.fr",
    name: "Dupont",
    firstname: "Marie",
  },
  inviter: {
    email: "jean.martin@univ-lorraine.fr",
    name: "Martin",
    firstname: "Jean",
  },
  sampleName: "Basalt core 12",
  sampleUrl: SAMPLE_URL,
};

describe("sampleInvitationMail", () => {
  it("should name the inviter and the sample, and link it", async () => {
    const mail = await sampleInvitationMail(invitation);

    expect(mail.subject).toBe(
      'Jean Martin invited you to contribute to "Basalt core 12"',
    );
    expect(mail.text).toBe(
      `Hello Marie Dupont,

Jean Martin invited you to contribute to the sample "Basalt core 12".

Open the sample: ${SAMPLE_URL}
`,
    );
    expect(mail.html).toContain("Jean Martin");
    expect(mail.html).toContain("Basalt core 12");
    expect(mail.html).toContain(SAMPLE_URL);
  });

  it("should fall back to a plain greeting when the invitee has no name", async () => {
    const mail = await sampleInvitationMail({
      ...invitation,
      invitee: {
        email: "marie.dupont@univ-lorraine.fr",
        name: null,
        firstname: null,
      },
    });

    expect(mail.text).toContain("Hello,");
    expect(mail.html).toContain("Hello,");
  });

  it("should fall back to the inviter's email when they have no name", async () => {
    const mail = await sampleInvitationMail({
      ...invitation,
      inviter: {
        email: "jean.martin@univ-lorraine.fr",
        name: null,
        firstname: null,
      },
    });

    expect(mail.subject).toBe(
      'jean.martin@univ-lorraine.fr invited you to contribute to "Basalt core 12"',
    );
    expect(mail.text).toContain("jean.martin@univ-lorraine.fr invited you");
  });

  it("should escape html carried by the inviter and the sample name", async () => {
    const mail = await sampleInvitationMail({
      ...invitation,
      inviter: {
        email: "jean.martin@univ-lorraine.fr",
        name: "<b>Martin</b>",
        firstname: null,
      },
      sampleName: "<script>alert(1)</script>",
    });

    expect(mail.html).not.toContain("<b>Martin</b>");
    expect(mail.html).toContain("&lt;b&gt;Martin&lt;/b&gt;");
    expect(mail.html).not.toContain("<script>alert(1)</script>");
    expect(mail.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
