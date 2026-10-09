import { describe, expect, it } from "vitest";

import { dataGouvConfig } from "./config.ts";

const URL = "https://demo.data.gouv.fr";

describe("dataGouvConfig", () => {
  it("should be null when DATA_GOUV_URL is unset", () => {
    expect(dataGouvConfig({})).toBeNull();
  });

  it("should read the config with the URL's trailing slash trimmed", () => {
    expect(
      dataGouvConfig({
        DATA_GOUV_URL: `${URL}/`,
        DATA_GOUV_NAME: "igsn-samples",
        DATA_GOUV_TOKEN: "secret",
      }),
    ).toEqual({ url: URL, name: "igsn-samples", token: "secret" });
  });

  it.each([
    { DATA_GOUV_URL: URL, DATA_GOUV_TOKEN: "secret" },
    { DATA_GOUV_URL: URL, DATA_GOUV_NAME: "igsn-samples" },
  ])("should throw when DATA_GOUV_URL is set without the rest (%o)", (env) => {
    expect(() => dataGouvConfig(env)).toThrow();
  });
});
