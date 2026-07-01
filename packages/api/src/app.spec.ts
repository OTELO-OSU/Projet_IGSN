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
});
