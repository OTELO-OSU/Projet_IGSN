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
    expect(toPublicSample(sample)).toEqual({
      ...sample,
      canContactArchive: false,
    });
  });

  it.each([
    { currentArchiveContactEmail: "ada@example.org", canContactArchive: true },
    { currentArchiveContactEmail: null, canContactArchive: false },
  ])(
    "should tell whether the archive is contactable from email $currentArchiveContactEmail without serving it",
    ({ currentArchiveContactEmail, canContactArchive }) => {
      const view = toPublicSample({
        ...sample,
        repository: { currentArchiveContactEmail },
      } as Sample);
      expect(view).toMatchObject({
        canContactArchive,
        repository: { currentArchiveContactEmail: null },
      });
    },
  );

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
