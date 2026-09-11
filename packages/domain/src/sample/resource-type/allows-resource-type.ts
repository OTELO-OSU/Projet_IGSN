import { isPathAtOrUnder } from "../path/is-at-or-under.ts";

const RESOURCE_TYPE_MATERIAL_BRANCHES = [
  "rock_and_sediment.rock.igneous",
  "rock_and_sediment.rock.metamorphic",
  "rock_and_sediment.rock.sedimentary",
  "rock_and_sediment.rock.hydrothermal",
  "rock_and_sediment.sediment",
];

export function allowsResourceType(
  material: string | null | undefined,
): boolean {
  return RESOURCE_TYPE_MATERIAL_BRANCHES.some((branch) =>
    isPathAtOrUnder(material, branch),
  );
}
