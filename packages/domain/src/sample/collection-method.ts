import { z } from "zod";

// Hierarchical controlled vocabulary stored as dot-separated ltree paths, like
// sampleType. An ancestor path ("coring") is a valid, partial classification.
// Declaration order is the order the form walks: a parent is always declared
// before its children (HierarchySelectField's tree builder relies on it).
export const collectionMethodSchema = z.enum([
  "blasting",
  "camera_sled_camera_tow",
  "coring",
  "coring.box_corer",
  "coring.camera_mounted",
  "coring.drill_corer",
  "coring.free_fall_corer",
  "coring.gravity_corer",
  "coring.gravity_corer.giant",
  "coring.gravity_corer.pilot",
  "coring.gravity_corer.free_fall_corer",
  "coring.gravity_corer.multi_corer",
  "coring.gravity_corer.casq_corer",
  "coring.gravity_corer.box_corer",
  "coring.gravity_corer.freeze_corer",
  "coring.hand_held_corer",
  "coring.kastenlot_corer",
  "coring.multi_corer",
  "coring.piston_corer",
  "coring.piston_corer.giant",
  "coring.piston_corer.stationary_piston",
  "coring.piston_corer.rock_corer",
  "coring.piston_corer.side_saddle_corer",
  "coring.piston_corer.submersible_mounted_corer",
  "coring.piston_corer.trigger_weight_corer",
  "coring.piston_corer.vibrating_corer",
  "coring.piston_corer.tube_without_corer",
  "coring.piston_corer.russian_corer",
  "coring.piston_corer.freeze_corer",
  "coring.piston_corer.hollow_auger_corer",
  "coring.rock_corer",
  "coring.side_saddle_corer",
  "coring.submersible_mounted_corer",
  "coring.trigger_weight_corer",
  "coring.vibrating_corer",
  "coring.tube_without_corer",
  "coring.russian_corer",
  "coring.freeze_corer",
  "coring.hollow_auger_corer",
  "dredging",
  "dredging.chain_bag",
  "dredging.chain_bag_dredge",
  "experimental_apparatus",
  "grab",
  "grab.hov",
  "grab.rov",
  "manual",
  "probe",
  "sediment_trap",
  "spatial_mission",
  "suspended_sediment",
  "unknown",
]);

export type CollectionMethod = z.infer<typeof collectionMethodSchema>;

export const COLLECTION_METHODS = collectionMethodSchema.options;
