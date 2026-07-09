import { z } from "zod";

// Hierarchical material classification, as dot-joined lower_snake_case codes
// (i18n rule: codes, not labels). A sample's path may stop at any depth; only a
// leaf path is publishable (see is-material-leaf). ltree stores this in the DB.
// Flat source of truth: the parent of every path is itself a member (asserted in
// the spec), so children/leaf/ancestors derive by string prefixes with no tree
// type gymnastics. Currently two levels (roots + rock subtypes); deeper levels
// extend this same tuple.
export const MATERIAL_PATHS = [
  "rock",
  "rock.igneous",
  "rock.metamorphic",
  "rock.sedimentary",
  "rock.hydrothermal",
  "rock.unknown",
  "sediment",
  "mineral",
  "fossil",
  "synthetic_rock_mineral",
  "extraterrestrial_rock",
] as const;

export const materialPathSchema = z.enum(MATERIAL_PATHS);

export type MaterialPath = z.infer<typeof materialPathSchema>;
