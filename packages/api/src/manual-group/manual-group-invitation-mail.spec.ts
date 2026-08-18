import { describe, expect, it } from "vitest";

import { manualGroupInvitationMail } from "./manual-group-invitation-mail.ts";

const SETTINGS_URL = "http://localhost:3001/settings";

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
  groupNames: ["Massif Central 2026"],
  settingsUrl: SETTINGS_URL,
};

describe("manualGroupInvitationMail", () => {
  it.each([
    ["a named sender", invitation.inviter, "Jean Martin"],
    [
      "a sender with no name",
      { email: "jean.martin@univ-lorraine.fr", name: null, firstname: null },
      "jean.martin@univ-lorraine.fr",
    ],
  ])(
    "should name %s and the group, and link the settings page",
    async (_case, inviter, sender) => {
      const mail = await manualGroupInvitationMail({ ...invitation, inviter });

      expect(mail.subject).toBe(
        `${sender} added you to the group "Massif Central 2026"`,
      );
      expect(mail.text).toBe(
        `Hello Marie Dupont,

${sender} added you to the group "Massif Central 2026". You can see the groups you belong to in your settings.

Open my settings: ${SETTINGS_URL}
`,
      );
    },
  );

  it("should list every group in one mail when the user joined several", async () => {
    const mail = await manualGroupInvitationMail({
      ...invitation,
      groupNames: ["Massif Central 2026", "Vosges 2027"],
    });

    expect(mail.subject).toBe("Jean Martin added you to 2 groups");
    expect(mail.text).toBe(
      `Hello Marie Dupont,

Jean Martin added you to the groups "Massif Central 2026", "Vosges 2027". You can see the groups you belong to in your settings.

Open my settings: ${SETTINGS_URL}
`,
    );
  });
});
