import { describe, expect, it } from "vitest";

import {
  manualGroupNameBodySchema,
  requestManualGroupBodySchema,
} from "./manual-group-validator.ts";

describe("manualGroupNameBodySchema", () => {
  it("should trim the name", () => {
    expect(
      manualGroupNameBodySchema.parse({ name: "  Volcano project  " }),
    ).toEqual({ name: "Volcano project" });
  });

  it.each([
    ["a whitespace-only name", "   "],
    ["a name over 120 characters", "a".repeat(121)],
  ])("should refuse %s", (_case, name) => {
    expect(manualGroupNameBodySchema.safeParse({ name }).success).toBe(false);
  });
});

const MANAGER = "01890a5d-ac96-774b-bcce-b302099a8002";

describe("requestManualGroupBodySchema", () => {
  it.each([
    ["an empty manager list", { name: "Volcano project", managerIds: [] }],
    [
      "more than 20 managers",
      {
        name: "Volcano project",
        managerIds: Array.from({ length: 21 }, () => MANAGER),
      },
    ],
  ])("should refuse %s", (_case, body) => {
    expect(requestManualGroupBodySchema.safeParse(body).success).toBe(false);
  });

  it("should accept a name and one manager", () => {
    expect(
      requestManualGroupBodySchema.parse({
        name: "  Volcano project  ",
        managerIds: [MANAGER],
      }),
    ).toEqual({ name: "Volcano project", managerIds: [MANAGER] });
  });
});
