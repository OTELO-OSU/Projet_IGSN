import { LABORATORIES } from "./laboratory.ts";

const ids = LABORATORIES.map(({ id }) => id);
const codes = LABORATORIES.flatMap(({ code, formerCodes = [] }) => [
  code,
  ...formerCodes,
]);

describe("LABORATORIES", () => {
  it("should key each laboratory by a distinct id", () => {
    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  });

  it("should resolve each current or former code to one laboratory", () => {
    expect(
      codes.filter((code, index) => codes.indexOf(code) !== index),
    ).toEqual([]);
  });

  it("should replace a laboratory only by another listed laboratory", () => {
    expect(
      LABORATORIES.filter(
        ({ id, replacedBy }) =>
          replacedBy !== undefined &&
          (replacedBy === id || !ids.includes(replacedBy)),
      ),
    ).toEqual([]);
  });

  it("should end every replacement chain on a current laboratory", () => {
    const replacedByOf = new Map(
      LABORATORIES.map(({ id, replacedBy }) => [id, replacedBy]),
    );
    const looping = LABORATORIES.filter(({ id }) => {
      let current: string | undefined = id;
      for (let step = 0; step <= LABORATORIES.length; step++) {
        current = replacedByOf.get(current);
        if (current === undefined) return false;
      }
      return true;
    });

    expect(looping).toEqual([]);
  });
});
