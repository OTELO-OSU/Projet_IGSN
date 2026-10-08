import { describe, expect, it } from "vitest";

import { stackEnv } from "./compose-env.ts";

describe("stackEnv", () => {
  it("should send the stack its values verbatim, defaults applied, unset and deploy-only variables left out", () => {
    const pairs = stackEnv({
      DATABASE_PASSWORD: `p'a"s$x \${y} #w\\`,
      PORTAINER_API_KEY: "key",
    });

    expect(pairs).toContainEqual({ name: "DATABASE_NAME", value: "igsn" });
    expect(pairs).toContainEqual({
      name: "DATABASE_PASSWORD",
      value: `p'a"s$x \${y} #w\\`,
    });
    expect(pairs.map(({ name }) => name)).not.toContain("SMTP_USER");
    expect(pairs.map(({ name }) => name)).not.toContain("PORTAINER_API_KEY");
  });

  it("should refuse a value with a newline, naming its variable", () => {
    expect(() => stackEnv({ SMTP_HOST: "a\nb" })).toThrow("SMTP_HOST");
  });
});
