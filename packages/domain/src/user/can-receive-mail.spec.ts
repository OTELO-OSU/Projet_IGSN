import { describe, expect, it } from "vitest";

import { canReceiveMail } from "./can-receive-mail.ts";

describe("canReceiveMail", () => {
  it("should never mail a rejected user", () => {
    expect(
      canReceiveMail(
        { status: "rejected", mailOptOuts: [] },
        "sample_publication",
      ),
    ).toBe(false);
  });

  it("should not mail a kind the user switched off", () => {
    expect(
      canReceiveMail(
        { status: "accepted", mailOptOuts: ["sample_publication"] },
        "sample_publication",
      ),
    ).toBe(false);
  });

  it("should mail a kind the user kept on", () => {
    expect(
      canReceiveMail(
        { status: "accepted", mailOptOuts: ["sample_publication"] },
        "sample_deleted",
      ),
    ).toBe(true);
  });
});
