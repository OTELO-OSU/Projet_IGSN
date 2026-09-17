import { layoutLineage } from "./layout-lineage.ts";

const node = (id: string, generation: number) => ({ id, generation });
const edge = (parentId: string, childId: string) => ({ parentId, childId });

const positionOf = (
  placed: ReturnType<typeof layoutLineage<{ id: string; generation: number }>>,
  id: string,
) => placed.find((candidate) => candidate.id === id);

describe("layoutLineage", () => {
  it("should put the current sample at the origin and every generation in its own column", () => {
    const placed = layoutLineage(
      [node("parent", -1), node("current", 0), node("child", 1)],
      [edge("parent", "current"), edge("current", "child")],
    );

    expect(placed).toHaveLength(3);
    expect(positionOf(placed, "current")).toEqual({
      id: "current",
      generation: 0,
      x: 0,
      y: 0,
    });
    expect(positionOf(placed, "parent")?.x).toBe(-300);
    expect(positionOf(placed, "child")?.x).toBe(300);
  });

  it("should centre a level on y = 0", () => {
    const placed = layoutLineage(
      [
        node("current", 0),
        node("first", 1),
        node("second", 1),
        node("third", 1),
      ],
      [
        edge("current", "first"),
        edge("current", "second"),
        edge("current", "third"),
      ],
    );

    expect(placed.map(({ id, y }) => [id, y])).toEqual([
      ["current", 0],
      ["first", -80],
      ["second", 0],
      ["third", 80],
    ]);
  });

  it("should order a level by the mean rank of its inner neighbours", () => {
    const placed = layoutLineage(
      [
        node("current", 0),
        node("first", 1),
        node("second", 1),
        node("under-second", 2),
        node("under-first", 2),
      ],
      [
        edge("current", "first"),
        edge("current", "second"),
        edge("second", "under-second"),
        edge("first", "under-first"),
      ],
    );

    expect(positionOf(placed, "under-first")?.y).toBe(-40);
    expect(positionOf(placed, "under-second")?.y).toBe(40);
  });

  it("should sort nodes without an inner neighbour last, in input order", () => {
    const placed = layoutLineage(
      [
        node("current", 0),
        node("loose-first", 1),
        node("connected", 1),
        node("loose-second", 1),
      ],
      [edge("current", "connected")],
    );

    expect(placed.map(({ id, y }) => [id, y])).toEqual([
      ["current", 0],
      ["connected", -80],
      ["loose-first", 0],
      ["loose-second", 80],
    ]);
  });

  it("should ignore an edge naming a node it was not given", () => {
    const placed = layoutLineage(
      [node("current", 0), node("stranger", 1), node("connected", 1)],
      [edge("current", "connected"), edge("unknown", "stranger")],
    );

    expect(positionOf(placed, "connected")?.y).toBe(-40);
    expect(positionOf(placed, "stranger")?.y).toBe(40);
  });
});
