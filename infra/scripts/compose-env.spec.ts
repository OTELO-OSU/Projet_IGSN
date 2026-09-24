import { describe, expect, it } from "vitest";

import { quote } from "./compose-env.ts";

describe("quote", () => {
  it("should escape what compose would otherwise interpolate, strip as a comment or end the value on", () => {
    expect(quote(`p'a"s$x \${y} #w\\`)).toBe(`"p'a\\"s$$x $\${y} #w\\\\"`);
  });
});
