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

  it("should redact the archive contacts and the account links of a published sample", () => {
    const archived = {
      ...sample,
      repository: {
        currentArchiveContactFirstname: "Ada",
        currentArchiveContactLastname: "Lovelace",
        originalArchiveContactFirstname: "Marie",
        originalArchiveContactLastname: "Curie",
      },
      scientificContext: {
        provenanceStatus: "field_sample",
        chiefScientistUserId: "b7b3e4c2-1f9a-4a4f-9c3e-2d1f7a5c8e10",
        collectorUserId: "b7b3e4c2-1f9a-4a4f-9c3e-2d1f7a5c8e10",
      },
      syntheticDetails: {
        operatorUserId: "b7b3e4c2-1f9a-4a4f-9c3e-2d1f7a5c8e10",
      },
    } as Sample;

    expect(toPublicSample(archived)).toMatchObject({
      repository: {
        currentArchiveContactFirstname: null,
        currentArchiveContactLastname: null,
        originalArchiveContactFirstname: null,
        originalArchiveContactLastname: null,
      },
      scientificContext: {
        chiefScientistUserId: null,
        collectorUserId: null,
      },
      syntheticDetails: { operatorUserId: null },
    });
  });

  it("should redact a withdrawn sample", () => {
    const withdrawn = { ...sample, status: "withdrawn" } as Sample;
    expect(toPublicSample(withdrawn)).toEqual(toWithdrawnSample(withdrawn));
  });

  it.each(["draft", "tombstone"] as SampleStatus[])(
    "should refuse a public view of a %s sample",
    (status) => {
      expect(() => toPublicSample({ ...sample, status })).toThrow();
    },
  );
});
