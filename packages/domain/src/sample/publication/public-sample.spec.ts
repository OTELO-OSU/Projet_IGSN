import type { Sample, SampleStatus } from "../sample.ts";

import { toPublicSample } from "./public-sample.ts";
import { toWithdrawnSample } from "./withdrawn-sample.ts";

const sample = {
  status: "published",
  igsn: "CNRS1234567890",
  name: "Rhyolite 11",
} as Sample;

describe("toPublicSample", () => {
  it("should serve a published sample whole", () => {
    expect(toPublicSample(sample)).toEqual(sample);
  });

  it("should redact a withdrawn sample", () => {
    const withdrawn = { ...sample, status: "withdrawn" } as Sample;
    expect(toPublicSample(withdrawn)).toEqual(toWithdrawnSample(withdrawn));
  });

  it("should keep the publishing error out of a published view", () => {
    expect(
      toPublicSample({ ...sample, publishingError: null }),
    ).not.toHaveProperty("publishingError");
  });

  it.each([
    "draft",
    "publishing",
    "publish_failed",
    "tombstone",
  ] as SampleStatus[])(
    "should refuse a public view of a %s sample",
    (status) => {
      expect(() => toPublicSample({ ...sample, status })).toThrow();
    },
  );
});
