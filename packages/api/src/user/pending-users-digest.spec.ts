import type { PendingUser } from "@projet-igsn/domain/user/repository";

import { describe, expect, it } from "vitest";

import { pendingUsersDigest } from "./pending-users-digest.ts";

const now = new Date("2026-08-06T12:00:00Z");

const USERS_URL = "http://localhost:3001/users";

const pendingUser = (overrides: Partial<PendingUser> = {}): PendingUser => ({
  email: "jean.martin@univ-lorraine.fr",
  name: "Martin",
  firstname: "Jean",
  createdAt: new Date("2026-08-01T12:00:00Z"),
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

    const digest = await pendingUsersDigest(pending, USERS_URL, now);

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
      USERS_URL,
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
        USERS_URL,
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
        USERS_URL,
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
    const digest = await pendingUsersDigest([pendingUser()], USERS_URL, now);

    expect(digest.html).toContain(`href="${USERS_URL}"`);
    expect(digest.html).toContain(`>${USERS_URL}</a`);
  });

  it("should escape markup coming from an account", async () => {
    const html = (
      await pendingUsersDigest(
        [pendingUser({ name: "<script>alert(1)</script>" })],
        USERS_URL,
        now,
      )
    ).html;

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("should fall back to the email when the account has no name", async () => {
    const digest = await pendingUsersDigest(
      [pendingUser({ name: null, firstname: null })],
      USERS_URL,
      now,
    );

    expect(digest.text).toContain(
      "- jean.martin@univ-lorraine.fr, waiting for 5 days",
    );
  });
});
