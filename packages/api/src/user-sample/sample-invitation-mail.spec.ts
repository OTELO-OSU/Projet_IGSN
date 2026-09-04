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
  role: "contributor" as const,
  sampleName: "Basalt core 12",
  sampleUrl: SAMPLE_URL,
};

describe("sampleInvitationMail", () => {
  it("should name the inviter and the sample, and link it", async () => {
    const mail = await sampleInvitationMail(invitation);

    expect(mail.subject).toBe(
      'Jean Martin designated you as a contributor for the sample "Basalt core 12"',
    );
    expect(mail.text).toBe(
      `Hello Marie Dupont,

Jean Martin designated you as a contributor for the sample "Basalt core 12". You may edit it while it is a draft.

Open the sample: ${SAMPLE_URL}
`,
    );
    expect(mail.html).toContain("Jean Martin");
    expect(mail.html).toContain("Basalt core 12");
    expect(mail.html).toContain(SAMPLE_URL);
  });

  it("should repeat the url as copyable text besides the button link", async () => {
    const mail = await sampleInvitationMail(invitation);

    expect(mail.html).toContain(`href="${SAMPLE_URL}"`);
    expect(mail.html).toContain(`>${SAMPLE_URL}</a`);
  });

  it("should tell an editor they may publish the sample", async () => {
    const mail = await sampleInvitationMail({ ...invitation, role: "editor" });

    expect(mail.subject).toBe(
      'Jean Martin designated you as an editor for the sample "Basalt core 12"',
    );
    expect(mail.text).toContain(
      'Jean Martin designated you as an editor for the sample "Basalt core 12". You may edit it, publish it and keep editing it afterwards.',
    );
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
      'jean.martin@univ-lorraine.fr designated you as a contributor for the sample "Basalt core 12"',
    );
    expect(mail.text).toContain("jean.martin@univ-lorraine.fr designated you");
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

  it.each([
    ["Core $& 12", "Core $&amp; 12"],
    ["Core $' 12", "Core $' 12"],
    ["Core $` 12", "Core $` 12"],
    ["Core $1 12", "Core $1 12"],
  ])(
    "should render %s literally rather than as a replacement pattern",
    async (sampleName, expected) => {
      const mail = await sampleInvitationMail({ ...invitation, sampleName });

      expect(mail.html).toContain(expected);
    },
  );

  it("should not let a sample name named after a placeholder consume it", async () => {
    const mail = await sampleInvitationMail({
      ...invitation,
      sampleName: "__URL__",
    });

    expect(mail.html).toContain(`href="${SAMPLE_URL}"`);
  });
});
