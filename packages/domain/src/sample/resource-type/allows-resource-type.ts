import { isPathAtOrUnder } from "../path/is-at-or-under.ts";

const RESOURCE_TYPE_MATERIAL_BRANCHES = [
  "rock.igneous",
  "rock.metamorphic",
  "rock.sedimentary",
  "rock.hydrothermal",
  "sediment",
];

export function allowsResourceType(
  material: string | null | undefined,
): boolean {
  return RESOURCE_TYPE_MATERIAL_BRANCHES.some((branch) =>
    isPathAtOrUnder(material, branch),
  );
}
