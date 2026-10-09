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

  it.each(["withdrawn", "embargo"] as SampleStatus[])(
    "should redact a %s sample",
    (status) => {
      const hidden = { ...sample, status } as Sample;
      expect(toPublicSample(hidden)).toEqual(toWithdrawnSample(hidden));
    },
  );

  it("should keep the synchronization state out of a published view", () => {
    const view = toPublicSample({
      ...sample,
      synchronizationStatus: "failed",
      synchronizationError: "DataCite is down",
    });
    expect(view).not.toHaveProperty("synchronizationStatus");
    expect(view).not.toHaveProperty("synchronizationError");
  });

  it.each(["draft", "tombstone"] as SampleStatus[])(
    "should refuse a public view of a %s sample",
    (status) => {
      expect(() => toPublicSample({ ...sample, status })).toThrow();
    },
  );
});
