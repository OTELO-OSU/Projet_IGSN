import { createRepositorySchema, repositorySchema } from "./model.ts";

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

describe("repositorySchema", () => {
  it.each([
    { input: "ada@example.org", stored: "ada@example.org" },
    { input: "  ada@example.org  ", stored: "ada@example.org" },
    { input: null, stored: null },
    { input: undefined, stored: undefined },
  ])(
    "should store the current archive contact email $input as $stored",
    ({ input, stored }) => {
      expect(
        repositorySchema.parse({
          ...REPOSITORY,
          currentArchiveContactEmail: input,
        }).currentArchiveContactEmail,
      ).toBe(stored);
    },
  );

  it.each(["not-an-email", ""])(
    "should refuse %j as the current archive contact email",
    (currentArchiveContactEmail) => {
      expect(
        repositorySchema.safeParse({
          ...REPOSITORY,
          currentArchiveContactEmail,
        }).error?.issues[0]?.path,
      ).toEqual(["currentArchiveContactEmail"]);
    },
  );
});
