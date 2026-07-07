import type { MaterialPath } from "@projet-igsn/domain/sample/material";

import { m } from "#/paraglide/messages.js";

// Typed map from each material path node to its translation (i18n rule, ADR
// 0005): adding a path without its `material_*` message fails to compile here.
// The label is the node's own name; the UI joins ancestors into a breadcrumb.
const MATERIAL_PATH_LABELS: Record<MaterialPath, () => string> = {
  rock: m.material_rock,
  "rock.igneous": m.material_rock_igneous,
  "rock.metamorphic": m.material_rock_metamorphic,
  "rock.sedimentary": m.material_rock_sedimentary,
  "rock.hydrothermal": m.material_rock_hydrothermal,
  "rock.unknown": m.material_rock_unknown,
  sediment: m.material_sediment,
  mineral: m.material_mineral,
  fossil: m.material_fossil,
  synthetic_rock_mineral: m.material_synthetic_rock_mineral,
  extraterrestrial_rock: m.material_extraterrestrial_rock,
};

export function materialPathLabel(path: MaterialPath): string {
  return MATERIAL_PATH_LABELS[path]();
}
