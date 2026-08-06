import { describe, expect, it } from "vitest";

import type { Messages } from "../sample/create-sample-labels.ts";

import { USER_STATUSES } from "./model.ts";
import { createUserStatusLabel } from "./user-status-labels.ts";

const messages = {
  user_status_pending: () => "Pending",
  user_status_accepted: () => "Accepted",
  user_status_rejected: () => "Rejected",
} as unknown as Messages;

describe("createUserStatusLabel", () => {
  it("should resolve every status through the catalog", () => {
    const userStatusLabel = createUserStatusLabel(messages);
    expect(USER_STATUSES.map(userStatusLabel)).toEqual([
      "Pending",
      "Accepted",
      "Rejected",
    ]);
  });

  it("should fall back to the key when a translation is missing", () => {
    const userStatusLabel = createUserStatusLabel({} as unknown as Messages);
    expect(userStatusLabel("pending")).toBe("user_status_pending");
  });
});
