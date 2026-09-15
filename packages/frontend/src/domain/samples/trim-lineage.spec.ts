import type {
  SampleLineage,
  SampleLineageNode,
} from "@projet-igsn/domain/sample/lineage/model";

import { trimLineage } from "./trim-lineage.ts";

const node = (id: string, generation: number): SampleLineageNode => ({
  id,
  igsn: `IGSN-${id}`,
  name: id,
  material: null,
  generation,
  tombstone: false,
});

const edge = (parentId: string, childId: string) => ({ parentId, childId });

const graph = (
  nodes: SampleLineageNode[],
  edges: { parentId: string; childId: string }[],
): SampleLineage => ({ nodes, edges, truncated: false });

const limits = { maxGenerations: 2, maxPerLevel: 4 };

describe("trimLineage", () => {
  it("should keep a lineage that already fits untouched", () => {
    const lineage = graph(
      [node("parent", -1), node("current", 0), node("child", 1)],
      [edge("parent", "current"), edge("current", "child")],
    );

    expect(trimLineage(lineage, "current", limits)).toEqual({
      nodes: lineage.nodes,
      edges: lineage.edges,
      dropped: {},
    });
  });

  it("should keep a lone sample alone", () => {
    const lineage = graph([node("current", 0)], []);

    expect(trimLineage(lineage, "current", limits)).toEqual({
      nodes: [node("current", 0)],
      edges: [],
      dropped: {},
    });
  });

  it("should stop at the generation limit, recording nothing beyond it", () => {
    const lineage = graph(
      [
        node("great-great", -4),
        node("great", -3),
        node("grand", -2),
        node("parent", -1),
        node("current", 0),
      ],
      [
        edge("great-great", "great"),
        edge("great", "grand"),
        edge("grand", "parent"),
        edge("parent", "current"),
      ],
    );

    const { nodes, dropped } = trimLineage(lineage, "current", limits);

    expect(nodes.map(({ id }) => id)).toEqual(["grand", "parent", "current"]);
    expect(dropped).toEqual({});
  });

  it("should keep the first nodes of a level in api order and count the rest", () => {
    const children = ["a", "b", "c", "d", "e", "f", "g"];
    const lineage = graph(
      [node("current", 0), ...children.map((id) => node(id, 1))],
      children.map((id) => edge("current", id)),
    );

    const { nodes, dropped } = trimLineage(lineage, "current", limits);

    expect(nodes.map(({ id }) => id)).toEqual(["current", "a", "b", "c", "d"]);
    expect(dropped).toEqual({ 1: 3 });
  });

  it("should drop the descendants of a dropped node and count them at their own level", () => {
    const lineage = graph(
      [
        node("current", 0),
        node("kept", 1),
        node("cut", 1),
        node("under-kept", 2),
        node("under-cut", 2),
      ],
      [
        edge("current", "kept"),
        edge("current", "cut"),
        edge("kept", "under-kept"),
        edge("cut", "under-cut"),
      ],
    );

    const { nodes, dropped } = trimLineage(lineage, "current", {
      maxGenerations: 2,
      maxPerLevel: 1,
    });

    expect(nodes.map(({ id }) => id)).toEqual([
      "current",
      "kept",
      "under-kept",
    ]);
    expect(dropped).toEqual({ 1: 1, 2: 1 });
  });

  it("should drop an edge whose endpoint was trimmed", () => {
    const lineage = graph(
      [node("current", 0), node("kept", 1), node("cut", 1)],
      [edge("current", "kept"), edge("current", "cut")],
    );

    const { edges } = trimLineage(lineage, "current", {
      maxGenerations: 2,
      maxPerLevel: 1,
    });

    expect(edges).toEqual([edge("current", "kept")]);
  });
});
