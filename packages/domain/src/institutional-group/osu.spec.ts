import { OSUS } from "./osu.ts";

describe("OSUS", () => {
  it("should key each OSU by a distinct id", () => {
    const ids = OSUS.map(({ id }) => id);

    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  });

  it("should resolve each current or former code to one OSU", () => {
    const codes = OSUS.flatMap(({ code, formerCodes = [] }) => [
      code,
      ...formerCodes,
    ]);

    expect(
      codes.filter((code, index) => codes.indexOf(code) !== index),
    ).toEqual([]);
  });
});
