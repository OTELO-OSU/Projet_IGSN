import { ForbiddenError, parseSampleResponse } from "./use-sample.ts";

describe("parseSampleResponse", () => {
  it("should return null when the sample does not exist", async () => {
    const res = new Response(null, { status: 404 });

    await expect(parseSampleResponse(res)).resolves.toBeNull();
  });

  it("should throw a ForbiddenError on another researcher's sample", async () => {
    const res = new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });

    await expect(parseSampleResponse(res)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("should throw on any other failure", async () => {
    const res = new Response(null, { status: 500 });

    await expect(parseSampleResponse(res)).rejects.toThrow(
      "Failed to load sample (500)",
    );
  });
});
