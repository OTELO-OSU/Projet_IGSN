import type { CollectionMethod } from "@projet-igsn/domain/sample/collection-method";

import { m } from "#/paraglide/messages.js";

// Typed map from collection-method path to its translation (.claude/rules/i18n.md):
// adding a CollectionMethod without its `collection_method_*` message fails to
// compile here, instead of rendering a placeholder to users at runtime.
const COLLECTION_METHOD_LABELS: Record<CollectionMethod, () => string> = {
  blasting: m.collection_method_blasting,
  camera_sled_camera_tow: m.collection_method_camera_sled_camera_tow,
  coring: m.collection_method_coring,
  "coring.box_corer": m.collection_method_coring_box_corer,
  "coring.camera_mounted": m.collection_method_coring_camera_mounted,
  "coring.drill_corer": m.collection_method_coring_drill_corer,
  "coring.free_fall_corer": m.collection_method_coring_free_fall_corer,
  "coring.gravity_corer": m.collection_method_coring_gravity_corer,
  "coring.gravity_corer.giant": m.collection_method_coring_gravity_corer_giant,
  "coring.gravity_corer.pilot": m.collection_method_coring_gravity_corer_pilot,
  "coring.gravity_corer.free_fall_corer":
    m.collection_method_coring_gravity_corer_free_fall_corer,
  "coring.gravity_corer.multi_corer":
    m.collection_method_coring_gravity_corer_multi_corer,
  "coring.gravity_corer.casq_corer":
    m.collection_method_coring_gravity_corer_casq_corer,
  "coring.gravity_corer.box_corer":
    m.collection_method_coring_gravity_corer_box_corer,
  "coring.gravity_corer.freeze_corer":
    m.collection_method_coring_gravity_corer_freeze_corer,
  "coring.hand_held_corer": m.collection_method_coring_hand_held_corer,
  "coring.kastenlot_corer": m.collection_method_coring_kastenlot_corer,
  "coring.multi_corer": m.collection_method_coring_multi_corer,
  "coring.piston_corer": m.collection_method_coring_piston_corer,
  "coring.piston_corer.giant": m.collection_method_coring_piston_corer_giant,
  "coring.piston_corer.stationary_piston":
    m.collection_method_coring_piston_corer_stationary_piston,
  "coring.piston_corer.rock_corer":
    m.collection_method_coring_piston_corer_rock_corer,
  "coring.piston_corer.side_saddle_corer":
    m.collection_method_coring_piston_corer_side_saddle_corer,
  "coring.piston_corer.submersible_mounted_corer":
    m.collection_method_coring_piston_corer_submersible_mounted_corer,
  "coring.piston_corer.trigger_weight_corer":
    m.collection_method_coring_piston_corer_trigger_weight_corer,
  "coring.piston_corer.vibrating_corer":
    m.collection_method_coring_piston_corer_vibrating_corer,
  "coring.piston_corer.tube_without_corer":
    m.collection_method_coring_piston_corer_tube_without_corer,
  "coring.piston_corer.russian_corer":
    m.collection_method_coring_piston_corer_russian_corer,
  "coring.piston_corer.freeze_corer":
    m.collection_method_coring_piston_corer_freeze_corer,
  "coring.piston_corer.hollow_auger_corer":
    m.collection_method_coring_piston_corer_hollow_auger_corer,
  "coring.rock_corer": m.collection_method_coring_rock_corer,
  "coring.side_saddle_corer": m.collection_method_coring_side_saddle_corer,
  "coring.submersible_mounted_corer":
    m.collection_method_coring_submersible_mounted_corer,
  "coring.trigger_weight_corer":
    m.collection_method_coring_trigger_weight_corer,
  "coring.vibrating_corer": m.collection_method_coring_vibrating_corer,
  "coring.tube_without_corer": m.collection_method_coring_tube_without_corer,
  "coring.russian_corer": m.collection_method_coring_russian_corer,
  "coring.freeze_corer": m.collection_method_coring_freeze_corer,
  "coring.hollow_auger_corer": m.collection_method_coring_hollow_auger_corer,
  dredging: m.collection_method_dredging,
  "dredging.chain_bag": m.collection_method_dredging_chain_bag,
  "dredging.chain_bag_dredge": m.collection_method_dredging_chain_bag_dredge,
  experimental_apparatus: m.collection_method_experimental_apparatus,
  grab: m.collection_method_grab,
  "grab.hov": m.collection_method_grab_hov,
  "grab.rov": m.collection_method_grab_rov,
  manual: m.collection_method_manual,
  probe: m.collection_method_probe,
  sediment_trap: m.collection_method_sediment_trap,
  spatial_mission: m.collection_method_spatial_mission,
  suspended_sediment: m.collection_method_suspended_sediment,
  unknown: m.collection_method_unknown,
};

export function collectionMethodLabel(method: CollectionMethod): string {
  return COLLECTION_METHOD_LABELS[method]();
}
