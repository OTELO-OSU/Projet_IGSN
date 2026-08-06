import type { PendingUser } from "@projet-igsn/domain/user/repository";

import { describe, expect, it } from "vitest";

import { pendingUsersDigest } from "./pending-users-digest.ts";

const now = new Date("2026-08-06T12:00:00Z");

const pendingUser = (overrides: Partial<PendingUser> = {}): PendingUser => ({
  email: "jean.martin@univ-lorraine.fr",
  name: "Martin",
  firstname: "Jean",
  createdAt: new Date("2026-08-01T12:00:00Z"),
  ...overrides,
});

describe("pendingUsersDigest", () => {
  it("should title the mail with the number of accounts waiting", () => {
    const digest = pendingUsersDigest(
      [
        pendingUser(),
        pendingUser({ email: "marie.dupont@univ-lorraine.fr" }),
        pendingUser({ email: "luc.blanc@univ-lorraine.fr" }),
      ],
      now,
    );

    expect(digest.subject).toBe("3 users are waiting for validation");
  });

  it("should keep the title singular for a single account", () => {
    const digest = pendingUsersDigest([pendingUser()], now);

    expect(digest.subject).toBe("1 user is waiting for validation");
  });

  it("should list each account with its name, email and waiting time", () => {
    const digest = pendingUsersDigest(
      [
        pendingUser({ createdAt: new Date("2026-07-07T12:00:00Z") }),
        pendingUser({
          email: "marie.dupont@univ-lorraine.fr",
          name: "Dupont",
          firstname: "Marie",
          createdAt: new Date("2026-08-05T09:00:00Z"),
        }),
      ],
      now,
    );

    expect(digest.text).toBe(
      `2 users are waiting for validation:

- Jean Martin (jean.martin@univ-lorraine.fr), waiting for 30 days
- Marie Dupont (marie.dupont@univ-lorraine.fr), waiting for 1 day
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
    ({ createdAt, waited }) => {
      const digest = pendingUsersDigest(
        [pendingUser({ createdAt: new Date(createdAt) })],
        now,
      );

      expect(digest.text).toContain(`waiting for ${waited}`);
    },
  );

  it("should fall back to the email when the account has no name", () => {
    const digest = pendingUsersDigest(
      [pendingUser({ name: null, firstname: null })],
      now,
    );

    expect(digest.text).toContain(
      "- jean.martin@univ-lorraine.fr, waiting for 5 days",
    );
  });
});
