import type { CollectionMethod } from "@projet-igsn/domain/sample/collection-method";

// Collection-method code -> its paraglide message id. Exhaustive over
// CollectionMethod (.claude/rules/i18n.md): a new code fails to compile here
// until its id is added.
const MESSAGE_KEYS = {
  blasting: "collection_method_blasting",
  camera_sled_camera_tow: "collection_method_camera_sled_camera_tow",
  coring: "collection_method_coring",
  "coring.box_corer": "collection_method_coring_box_corer",
  "coring.camera_mounted": "collection_method_coring_camera_mounted",
  "coring.drill_corer": "collection_method_coring_drill_corer",
  "coring.free_fall_corer": "collection_method_coring_free_fall_corer",
  "coring.gravity_corer": "collection_method_coring_gravity_corer",
  "coring.gravity_corer.giant": "collection_method_coring_gravity_corer_giant",
  "coring.gravity_corer.pilot": "collection_method_coring_gravity_corer_pilot",
  "coring.gravity_corer.free_fall_corer":
    "collection_method_coring_gravity_corer_free_fall_corer",
  "coring.gravity_corer.multi_corer":
    "collection_method_coring_gravity_corer_multi_corer",
  "coring.gravity_corer.casq_corer":
    "collection_method_coring_gravity_corer_casq_corer",
  "coring.gravity_corer.box_corer":
    "collection_method_coring_gravity_corer_box_corer",
  "coring.gravity_corer.freeze_corer":
    "collection_method_coring_gravity_corer_freeze_corer",
  "coring.hand_held_corer": "collection_method_coring_hand_held_corer",
  "coring.kastenlot_corer": "collection_method_coring_kastenlot_corer",
  "coring.multi_corer": "collection_method_coring_multi_corer",
  "coring.piston_corer": "collection_method_coring_piston_corer",
  "coring.piston_corer.giant": "collection_method_coring_piston_corer_giant",
  "coring.piston_corer.stationary_piston":
    "collection_method_coring_piston_corer_stationary_piston",
  "coring.piston_corer.rock_corer":
    "collection_method_coring_piston_corer_rock_corer",
  "coring.piston_corer.side_saddle_corer":
    "collection_method_coring_piston_corer_side_saddle_corer",
  "coring.piston_corer.submersible_mounted_corer":
    "collection_method_coring_piston_corer_submersible_mounted_corer",
  "coring.piston_corer.trigger_weight_corer":
    "collection_method_coring_piston_corer_trigger_weight_corer",
  "coring.piston_corer.vibrating_corer":
    "collection_method_coring_piston_corer_vibrating_corer",
  "coring.piston_corer.tube_without_corer":
    "collection_method_coring_piston_corer_tube_without_corer",
  "coring.piston_corer.russian_corer":
    "collection_method_coring_piston_corer_russian_corer",
  "coring.piston_corer.freeze_corer":
    "collection_method_coring_piston_corer_freeze_corer",
  "coring.piston_corer.hollow_auger_corer":
    "collection_method_coring_piston_corer_hollow_auger_corer",
  "coring.rock_corer": "collection_method_coring_rock_corer",
  "coring.side_saddle_corer": "collection_method_coring_side_saddle_corer",
  "coring.submersible_mounted_corer":
    "collection_method_coring_submersible_mounted_corer",
  "coring.trigger_weight_corer":
    "collection_method_coring_trigger_weight_corer",
  "coring.vibrating_corer": "collection_method_coring_vibrating_corer",
  "coring.tube_without_corer": "collection_method_coring_tube_without_corer",
  "coring.russian_corer": "collection_method_coring_russian_corer",
  "coring.freeze_corer": "collection_method_coring_freeze_corer",
  "coring.hollow_auger_corer": "collection_method_coring_hollow_auger_corer",
  dredging: "collection_method_dredging",
  "dredging.chain_bag": "collection_method_dredging_chain_bag",
  "dredging.chain_bag_dredge": "collection_method_dredging_chain_bag_dredge",
  experimental_apparatus: "collection_method_experimental_apparatus",
  grab: "collection_method_grab",
  "grab.hov": "collection_method_grab_hov",
  "grab.rov": "collection_method_grab_rov",
  manual: "collection_method_manual",
  probe: "collection_method_probe",
  sediment_trap: "collection_method_sediment_trap",
  spatial_mission: "collection_method_spatial_mission",
  suspended_sediment: "collection_method_suspended_sediment",
  unknown: "collection_method_unknown",
} as const satisfies Record<CollectionMethod, string>;

// The exact message ids this needs, as `() => string`. Keyed on the specific
// ids (not a `string` index signature), so an app's `m` with extra arg-taking
// messages still satisfies it.
type CollectionMethodMessages = {
  [K in CollectionMethod as (typeof MESSAGE_KEYS)[K]]: () => string;
};

// Each app owns its own paraglide `m`, so it passes it in: the messages object
// must carry every id above (a missing translation fails to compile at the call
// site), keeping the label map shared while translations stay per app.
export function createCollectionMethodLabel(
  messages: CollectionMethodMessages,
): (method: CollectionMethod) => string {
  return (method) => messages[MESSAGE_KEYS[method]]();
}
