import type { OrphanedGroup } from "@projet-igsn/domain/user/orphaned-group";
import type { PendingUser } from "@projet-igsn/domain/user/repository";

import { describe, expect, it } from "vitest";

import { pendingUsersDigest } from "./pending-users-digest.ts";

const now = new Date("2026-08-06T12:00:00Z");

const USERS_URL = "http://localhost:3001/users";
const ADMIN_URL = "http://localhost:3001/";
const URLS = { usersUrl: USERS_URL, adminUrl: ADMIN_URL };

const MASSIF = "01890a5d-ac96-774b-bcce-b302099a9001";

const ORPHAN_GROUPS: OrphanedGroup[] = [
  { kind: "manual", id: MASSIF, name: "Massif Central 2026" },
  { kind: "laboratory", code: "UMR7358", name: "GeoRessources" },
];

const pendingUser = (overrides: Partial<PendingUser> = {}): PendingUser => ({
  email: "jean.martin@univ-lorraine.fr",
  name: "Martin",
  firstname: "Jean",
  createdAt: new Date("2026-08-01T12:00:00Z"),
  institutionalLaboratory: null,
  ...overrides,
});

describe("pendingUsersDigest", () => {
  it.each([
    { count: 1, subject: "1 user is waiting for activation" },
    { count: 3, subject: "3 users are waiting for activation" },
  ])("should title the mail $subject", async ({ count, subject }) => {
    const pending = Array.from({ length: count }, (_, i) =>
      pendingUser({ email: `user${i}@univ-lorraine.fr` }),
    );

    const digest = await pendingUsersDigest(pending, [], URLS, now);

    expect(digest.subject).toBe(subject);
  });

  it("should list each account with its name, email and waiting time", async () => {
    const digest = await pendingUsersDigest(
      [
        pendingUser({ createdAt: new Date("2026-07-07T12:00:00Z") }),
        pendingUser({
          email: "marie.dupont@univ-lorraine.fr",
          name: "Dupont",
          firstname: "Marie",
          createdAt: new Date("2026-08-05T09:00:00Z"),
        }),
      ],
      [],
      URLS,
      now,
    );

    expect(digest.text).toBe(
      `2 users are waiting for activation:

- Jean Martin (jean.martin@univ-lorraine.fr), waiting for 30 days
- Marie Dupont (marie.dupont@univ-lorraine.fr), waiting for 1 day

Moderate these accounts: http://localhost:3001/users
`,
    );
  });

  it.each([
    { createdAt: "2026-08-06T11:20:00Z", waited: "less than an hour" },
    { createdAt: "2026-08-06T11:00:00Z", waited: "1 hour" },
    { createdAt: "2026-08-06T05:30:00Z", waited: "6 hours" },
    { createdAt: "2026-08-05T11:00:00Z", waited: "1 day" },
    { createdAt: "2026-08-04T12:00:00Z", waited: "2 days" },
  ])(
    "should say $waited for an account created $createdAt",
    async ({ createdAt, waited }) => {
      const digest = await pendingUsersDigest(
        [pendingUser({ createdAt: new Date(createdAt) })],
        [],
        URLS,
        now,
      );

      expect(digest.text).toContain(`waiting for ${waited}`);
    },
  );

  it("should render one linked html row per account, in the order given", async () => {
    const html = (
      await pendingUsersDigest(
        [
          pendingUser({ createdAt: new Date("2026-07-07T12:00:00Z") }),
          pendingUser({
            email: "marie.dupont@univ-lorraine.fr",
            name: "Dupont",
            firstname: "Marie",
            createdAt: new Date("2026-08-05T09:00:00Z"),
          }),
        ],
        [],
        URLS,
        now,
      )
    ).html;

    expect(html).toContain("<td>Jean Martin</td>");
    expect(html).toContain("<td>jean.martin@univ-lorraine.fr</td>");
    expect(html).toContain("<td>30 days</td>");
    expect(html).toContain(`href="${USERS_URL}"`);
    expect(html.indexOf("Jean Martin")).toBeLessThan(
      html.indexOf("Marie Dupont"),
    );
  });

  it("should repeat the url as copyable text besides the button link", async () => {
    const digest = await pendingUsersDigest([pendingUser()], [], URLS, now);

    expect(digest.html).toContain(`href="${USERS_URL}"`);
    expect(digest.html).toContain(`>${USERS_URL}</a`);
  });

  it("should escape markup coming from an account", async () => {
    const html = (
      await pendingUsersDigest(
        [pendingUser({ name: "<script>alert(1)</script>" })],
        [],
        URLS,
        now,
      )
    ).html;

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("should fall back to the email when the account has no name", async () => {
    const digest = await pendingUsersDigest(
      [pendingUser({ name: null, firstname: null })],
      [],
      URLS,
      now,
    );

    expect(digest.text).toContain(
      "- jean.martin@univ-lorraine.fr, waiting for 5 days",
    );
  });

  it("should title the mail after the orphan groups when nothing is pending", async () => {
    const digest = await pendingUsersDigest([], ORPHAN_GROUPS, URLS, now);

    expect(digest.subject).toBe("2 groups have no active manager");
  });

  it("should list each orphan group linked to its page", async () => {
    const digest = await pendingUsersDigest([], ORPHAN_GROUPS, URLS, now);

    expect(digest.text).toContain(
      `- Massif Central 2026: http://localhost:3001/manual-groups/${MASSIF}`,
    );
    expect(digest.text).toContain(
      "- GeoRessources: http://localhost:3001/institutional-groups/laboratories/UMR7358",
    );
    expect(digest.html).toContain(
      `href="http://localhost:3001/manual-groups/${MASSIF}"`,
    );
    expect(digest.html).toContain(
      'href="http://localhost:3001/institutional-groups/laboratories/UMR7358"',
    );
  });

  it("should leave the pending table out when nothing is pending", async () => {
    const digest = await pendingUsersDigest([], ORPHAN_GROUPS, URLS, now);

    expect(digest.html).not.toContain("Waiting for");
    expect(digest.text).not.toContain("waiting for");
  });

  it("should escape markup coming from a group name", async () => {
    const digest = await pendingUsersDigest(
      [],
      [{ kind: "manual", id: MASSIF, name: "<script>alert(1)</script>" }],
      URLS,
      now,
    );

    expect(digest.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(digest.html).not.toContain("<script>alert(1)</script>");
  });
});
