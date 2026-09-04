import { isPathAtOrUnder } from "../path/is-at-or-under.ts";

export function isMetamorphicRock(material: string | null): boolean {
  return isPathAtOrUnder(material, "rock.metamorphic");
}
