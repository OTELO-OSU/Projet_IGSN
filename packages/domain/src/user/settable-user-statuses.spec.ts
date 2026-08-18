import { describe, expect, it } from "vitest";

import { settableUserStatuses } from "./settable-user-statuses.ts";

describe("settableUserStatuses", () => {
  it("should offer pending to an unmoderated account, since it has not left it", () => {
    expect(settableUserStatuses("pending")).toEqual([
      "pending",
      "accepted",
      "rejected",
    ]);
  });

  it.each(["accepted", "rejected"] as const)(
    "should drop pending once the account is %s",
    (status) => {
      expect(settableUserStatuses(status)).toEqual(["accepted", "rejected"]);
    },
  );
});
