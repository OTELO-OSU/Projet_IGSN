import { describe, expect, it } from "vitest";

import { loadRateLimitConfig } from "./config.ts";
import { RATE_LIMIT_ROUTES } from "./route-budgets.ts";

describe("loadRateLimitConfig", () => {
  it("should keep the registry budgets and distrust proxy headers when nothing is set", () => {
    expect(loadRateLimitConfig({})).toEqual({
      trustProxyHeaders: false,
      routes: RATE_LIMIT_ROUTES,
    });
  });

  it("should override the points of the named route only", () => {
    expect(
      loadRateLimitConfig({ RATE_LIMIT_SAMPLES_LIST_POINTS: "5" }),
    ).toEqual({
      trustProxyHeaders: false,
      routes: RATE_LIMIT_ROUTES.map((route) =>
        route.key === "SAMPLES_LIST" ? { ...route, points: 5 } : route,
      ),
    });
  });

  it("should override the duration of the named route only", () => {
    expect(
      loadRateLimitConfig({ RATE_LIMIT_SAMPLES_LIST_DURATION: "10" }),
    ).toEqual({
      trustProxyHeaders: false,
      routes: RATE_LIMIT_ROUTES.map((route) =>
        route.key === "SAMPLES_LIST" ? { ...route, duration: 10 } : route,
      ),
    });
  });

  it("should treat an empty value as unset", () => {
    expect(loadRateLimitConfig({ RATE_LIMIT_SAMPLES_LIST_POINTS: "" })).toEqual(
      {
        trustProxyHeaders: false,
        routes: RATE_LIMIT_ROUTES,
      },
    );
  });

  it.each(["abc", "0", "-1", "1.5"])(
    "should throw naming the variable when a budget is %s",
    (value) => {
      expect(() =>
        loadRateLimitConfig({ RATE_LIMIT_SAMPLES_LIST_POINTS: value }),
      ).toThrow("RATE_LIMIT_SAMPLES_LIST_POINTS");
      expect(() =>
        loadRateLimitConfig({ RATE_LIMIT_SAMPLES_LIST_DURATION: value }),
      ).toThrow("RATE_LIMIT_SAMPLES_LIST_DURATION");
    },
  );

  it("should throw when RATE_LIMIT_ENABLED is not a boolean", () => {
    expect(() => loadRateLimitConfig({ RATE_LIMIT_ENABLED: "nope" })).toThrow();
  });

  it("should hold no route when RATE_LIMIT_ENABLED is false", () => {
    expect(loadRateLimitConfig({ RATE_LIMIT_ENABLED: "false" })).toEqual({
      trustProxyHeaders: false,
      routes: [],
    });
  });

  // Spelling variants must not silently read as "untrusted": that would key
  // every visitor on the proxy's own address, a site-wide budget.
  it.each(["true", "True", "TRUE", "1", "yes", "on"])(
    "should trust proxy headers when TRUST_PROXY_HEADERS is %s",
    (value) => {
      expect(loadRateLimitConfig({ TRUST_PROXY_HEADERS: value })).toEqual({
        trustProxyHeaders: true,
        routes: RATE_LIMIT_ROUTES,
      });
    },
  );

  it.each(["false", "0", "no", "off"])(
    "should distrust proxy headers when TRUST_PROXY_HEADERS is %s",
    (value) => {
      expect(loadRateLimitConfig({ TRUST_PROXY_HEADERS: value })).toEqual({
        trustProxyHeaders: false,
        routes: RATE_LIMIT_ROUTES,
      });
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
