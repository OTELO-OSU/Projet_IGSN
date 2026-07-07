import {
  type CollectionMethodNode,
  buildCollectionMethodTree,
} from "./collection-method-tree";

function findNode(
  nodes: CollectionMethodNode[],
  path: string,
): CollectionMethodNode | undefined {
  for (const node of nodes) {
    if (node.path === path) return node;
    const found = findNode(node.children, path);
    if (found) return found;
  }
  return undefined;
}

describe("buildCollectionMethodTree", () => {
  const tree = buildCollectionMethodTree();
  const node = (path: string) => findNode(tree, path);

  it("should expose top-level methods as roots in declaration order", () => {
    expect(tree.map((node) => node.path)).toEqual([
      "blasting",
      "camera_sled_camera_tow",
      "coring",
      "dredging",
      "experimental_apparatus",
      "grab",
      "manual",
      "probe",
      "sediment_trap",
      "spatial_mission",
      "suspended_sediment",
      "unknown",
    ]);
  });

  it("should keep a leaf method childless", () => {
    expect(node("blasting")?.children).toEqual([]);
  });

  it("should nest a method's direct children under it, in order", () => {
    expect(node("coring")?.children.map((n) => n.path)).toEqual([
      "coring.box_corer",
      "coring.camera_mounted",
      "coring.drill_corer",
      "coring.free_fall_corer",
      "coring.gravity_corer",
      "coring.hand_held_corer",
      "coring.kastenlot_corer",
      "coring.multi_corer",
      "coring.piston_corer",
      "coring.rock_corer",
      "coring.side_saddle_corer",
      "coring.submersible_mounted_corer",
      "coring.trigger_weight_corer",
      "coring.vibrating_corer",
      "coring.tube_without_corer",
      "coring.russian_corer",
      "coring.freeze_corer",
      "coring.hollow_auger_corer",
    ]);
  });

  it("should nest a third level under its parent", () => {
    expect(node("coring.gravity_corer")?.children.map((n) => n.path)).toEqual([
      "coring.gravity_corer.giant",
      "coring.gravity_corer.pilot",
      "coring.gravity_corer.free_fall_corer",
      "coring.gravity_corer.multi_corer",
      "coring.gravity_corer.casq_corer",
      "coring.gravity_corer.box_corer",
      "coring.gravity_corer.freeze_corer",
    ]);
  });
});
