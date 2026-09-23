import { createRepositorySchema } from "./model.ts";

const ROR = "02feahw73";

const REPOSITORY = {
  currentArchiveOsu: "OMP",
  currentArchiveLaboratory: "UMR3589",
  currentArchiveContactFirstname: "Ada",
  currentArchiveContactLastname: "Lovelace",
  collectionName: "Lorraine granites",
  rightsHolder: [ROR],
};

describe("createRepositorySchema", () => {
  it("should accept a laboratory of the archiving OSU", () => {
    expect(createRepositorySchema.safeParse(REPOSITORY).success).toBe(true);
  });

  it("should accept any known laboratory when no OSU archives the sample", () => {
    expect(
      createRepositorySchema.safeParse({
        ...REPOSITORY,
        currentArchiveOsu: null,
        currentArchiveLaboratory: "EA4038",
      }).success,
    ).toBe(true);
  });

  it.each([
    { rule: "an unknown OSU", currentArchiveOsu: "nope" },
    { rule: "an unknown laboratory", currentArchiveLaboratory: "nope" },
    {
      rule: "a laboratory of another OSU",
      currentArchiveLaboratory: "UMR5805",
    },
  ])("should reject $rule", (archive) => {
    expect(
      createRepositorySchema.safeParse({ ...REPOSITORY, ...archive }).success,
    ).toBe(false);
  });
});
