import { afterEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "./api.ts";
import { runWithClientIp } from "./client-ip.ts";
import { getSampleByIgsn } from "./domain/samples/client/get-sample-by-igsn.ts";
import { listSamples } from "./domain/samples/client/list-samples.ts";

const stubGlobalFetch = (body: unknown = {}, status = 200) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

const forwardedIps = (mock: ReturnType<typeof stubGlobalFetch>) =>
  mock.mock.calls.map((call) => new Headers(call[1]?.headers).get("X-Real-IP"));

describe("apiFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should forward the visitor IP of the surrounding SSR request", async () => {
    const fetchMock = stubGlobalFetch();

    await runWithClientIp("203.0.113.7", () =>
      apiFetch(new URL("http://api:8080/samples")),
    );

    expect(forwardedIps(fetchMock)).toEqual(["203.0.113.7"]);
  });

  it("should give each concurrent visitor its own IP", async () => {
    const fetchMock = stubGlobalFetch();

    await Promise.all(
      ["203.0.113.7", "198.51.100.4"].map((ip) =>
        runWithClientIp(ip, () => apiFetch(new URL("http://api:8080/samples"))),
      ),
    );

    expect(new Set(forwardedIps(fetchMock))).toEqual(
      new Set(["203.0.113.7", "198.51.100.4"]),
    );
  });

  it("should set no X-Real-IP outside an SSR request", async () => {
    const fetchMock = stubGlobalFetch();

    await apiFetch(new URL("http://api:8080/samples"));

    expect(forwardedIps(fetchMock)).toEqual([null]);
  });

  it("should set no X-Real-IP when the request carries none", async () => {
    const fetchMock = stubGlobalFetch();

    await runWithClientIp(undefined, () =>
      apiFetch(new URL("http://api:8080/samples")),
    );

    expect(forwardedIps(fetchMock)).toEqual([null]);
  });
});

describe("runWithClientIp on a cold store", () => {
  it("should keep each visitor's context when the first requests race", async () => {
    vi.resetModules();
    const { getClientIp, runWithClientIp: run } =
      await import("./client-ip.ts");
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

    const seen = await Promise.all(
      ["203.0.113.7", "198.51.100.4"].map((ip) =>
        run(ip, async () => {
          await tick();
          return getClientIp();
        }),
      ),
    );

    expect(seen).toEqual(["203.0.113.7", "198.51.100.4"]);
  });
});

describe("sample clients on SSR", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should forward the visitor IP when listing samples", async () => {
    const fetchMock = stubGlobalFetch({ data: [], meta: { total: 0 } });

    await runWithClientIp("203.0.113.7", () =>
      listSamples({ page: 1, perPage: 10 }),
    );

    expect(forwardedIps(fetchMock)).toEqual(["203.0.113.7"]);
  });

  it("should forward the visitor IP when reading one sample", async () => {
    const fetchMock = stubGlobalFetch({ error: "Sample not found" }, 404);

    await runWithClientIp("203.0.113.7", () => getSampleByIgsn("IGSN123"));

    expect(forwardedIps(fetchMock)).toEqual(["203.0.113.7"]);
  });
});

describe("api base urls", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const load = async (apiUrl?: string, viteApiUrl?: string) => {
    vi.resetModules();
    vi.stubEnv("API_URL", apiUrl);
    vi.stubEnv("VITE_API_URL", viteApiUrl);
    return import("./api.ts");
  };

  it.each(["http://api:3002/api", "http://api:3002/api/"])(
    "should resolve an SSR path under the configured path prefix (%s)",
    async (configured) => {
      const { baseApiUrl } = await load(configured, configured);

      expect(new URL("samples", baseApiUrl).href).toBe(
        "http://api:3002/api/samples",
      );
    },
  );

  it("should ignore the SSR api url in the browser url so a server-rendered link stays followable", async () => {
    const { baseBrowserApiUrl } = await load("http://api:3002/api", undefined);

    expect(new URL("samples", baseBrowserApiUrl).href).toBe(
      "http://localhost:3000/api/samples",
    );
  });
});
