import { testClient } from "hono/testing";

import app from "./app";

describe("app", () => {
  describe("GET /", () => {
    it("should return Hello World", async () => {
      const client = testClient(app);

      const res = await client.index.$get();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ message: "Hello World" });
    });
  });

  describe("GET /:name", () => {
    it("should return Hello {name}", async () => {
      const client = testClient(app);

      const res = await client[":name"].$get({ param: { name: "John" } });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ message: "Hello John" });
    });
  });

  describe("CORS", () => {
    const allowedOrigin = "http://localhost:3001";

    beforeEach(() => {
      process.env.CORS_ORIGINS = `${allowedOrigin},https://admin.example.test`;
    });

    afterEach(() => {
      delete process.env.CORS_ORIGINS;
    });

    it("should reflect the allow-origin header for an allowed origin", async () => {
      const client = testClient(app);

      const res = await client.index.$get(undefined, {
        headers: { Origin: allowedOrigin },
      });

      expect(res.headers.get("access-control-allow-origin")).toBe(
        allowedOrigin,
      );
      expect(res.headers.get("access-control-allow-credentials")).toBe("true");
    });

    it("should not set allow-origin for a disallowed origin", async () => {
      const client = testClient(app);

      const res = await client.index.$get(undefined, {
        headers: { Origin: "https://evil.example.test" },
      });

      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("should deny every origin when CORS_ORIGINS is empty", async () => {
      delete process.env.CORS_ORIGINS;
      const client = testClient(app);

      const res = await client.index.$get(undefined, {
        headers: { Origin: allowedOrigin },
      });

      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });
  });
});
