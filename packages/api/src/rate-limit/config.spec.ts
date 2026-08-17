import { describe, expect, it } from "vitest";

import { loadRateLimitConfig } from "./config.ts";

describe("loadRateLimitConfig", () => {
  it("should enable the limiter and distrust proxy headers when nothing is set", () => {
    expect(loadRateLimitConfig({})).toEqual({
      enabled: true,
      trustProxyHeaders: false,
    });
  });

  it("should disable the limiter when RATE_LIMIT_ENABLED is false", () => {
    expect(loadRateLimitConfig({ RATE_LIMIT_ENABLED: "false" }).enabled).toBe(
      false,
    );
  });

  it("should treat an empty RATE_LIMIT_ENABLED as unset", () => {
    expect(loadRateLimitConfig({ RATE_LIMIT_ENABLED: "" }).enabled).toBe(true);
  });

  it("should throw naming the variable when RATE_LIMIT_ENABLED is not a boolean", () => {
    expect(() => loadRateLimitConfig({ RATE_LIMIT_ENABLED: "nope" })).toThrow(
      "RATE_LIMIT_ENABLED",
    );
  });

  it.each(["true", "True", "TRUE", "1", "yes", "on"])(
    "should trust proxy headers when TRUST_PROXY_HEADERS is %s",
    (value) => {
      expect(
        loadRateLimitConfig({ TRUST_PROXY_HEADERS: value }).trustProxyHeaders,
      ).toBe(true);
    },
  );

  it.each(["false", "0", "no", "off", ""])(
    "should distrust proxy headers when TRUST_PROXY_HEADERS is %s",
    (value) => {
      expect(
        loadRateLimitConfig({ TRUST_PROXY_HEADERS: value }).trustProxyHeaders,
      ).toBe(false);
    },
  );

  it.each(["nope", " true", "true "])(
    "should throw rather than assume when TRUST_PROXY_HEADERS is %s",
    (value) => {
      expect(() => loadRateLimitConfig({ TRUST_PROXY_HEADERS: value })).toThrow(
        "TRUST_PROXY_HEADERS",
      );
    },
  );
});
