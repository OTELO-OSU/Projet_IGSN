import { m } from "#/paraglide/messages.js";

export function relationLabel(generation: number): string {
  if (generation === 0) return m.lineage_relation_current();
  if (generation === -1) return m.lineage_relation_parent();
  if (generation === 1) return m.lineage_relation_child();
  return generation < 0
    ? m.lineage_relation_ancestor({ generation: -generation })
    : m.lineage_relation_descendant({ generation });
}
