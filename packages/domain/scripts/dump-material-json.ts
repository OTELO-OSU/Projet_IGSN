// Print the material vocabulary structure as authored (roots + segment-keyed nodes).
// Run: pnpm -F @projet-igsn/domain material-tree:json
import { MATERIAL_HIERARCHY } from "../src/sample/material/classification.ts";

console.log(JSON.stringify(MATERIAL_HIERARCHY, null, 2));
