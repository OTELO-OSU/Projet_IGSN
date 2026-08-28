import type { OrphanedGroup } from "@projet-igsn/domain/user/orphaned-group";

import { describe, expect, it } from "vitest";

import { groupWithoutManagerMail } from "./group-without-manager-mail.ts";

const ADMIN_URL = "http://localhost:3001/";

const MASSIF: OrphanedGroup = {
  kind: "manual",
  id: "01890a5d-ac96-774b-bcce-b302099a9001",
  name: "Massif Central 2026",
};

describe("groupWithoutManagerMail", () => {
  it("should title the mail after the group", async () => {
    const mail = await groupWithoutManagerMail(MASSIF, ADMIN_URL);

    expect(mail.subject).toBe(
      'The group "Massif Central 2026" has no active manager',
    );
  });

  it("should name the group in the body", async () => {
    const mail = await groupWithoutManagerMail(MASSIF, ADMIN_URL);

    expect(mail.text).toContain("Massif Central 2026");
    expect(mail.html).toContain("Massif Central 2026");
  });

  it.each([
    {
      group: MASSIF,
      url: "http://localhost:3001/manual-groups/01890a5d-ac96-774b-bcce-b302099a9001",
    },
    {
      group: {
        kind: "organization" as const,
        code: "04vfs2w97",
        name: "Université de Lorraine",
      },
      url: "http://localhost:3001/institutional-groups/organizations/04vfs2w97",
    },
    {
      group: { kind: "osu" as const, code: "OTELo", name: "OTELo" },
      url: "http://localhost:3001/institutional-groups/osus/OTELo",
    },
    {
      group: {
        kind: "laboratory" as const,
        code: "UMR7358",
        name: "GeoRessources",
      },
      url: "http://localhost:3001/institutional-groups/laboratories/UMR7358",
    },
  ])("should link a $group.kind group to its page", async ({ group, url }) => {
    const mail = await groupWithoutManagerMail(group, ADMIN_URL);

    expect(mail.text).toContain(url);
    expect(mail.html).toContain(`href="${url}"`);
  });
});
