import { userSampleRoleSchema } from "./model.ts";

describe("userSampleRoleSchema", () => {
  it.each(["owner", "contributor"])("should accept the role %s", (input) => {
    const result = userSampleRoleSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it.each(["", "editor", "Owner", "admin", "reader"])(
    "should reject the role %s",
    (input) => {
      const result = userSampleRoleSchema.safeParse(input);

      expect(result.success).toBe(false);
    },
  );
});
