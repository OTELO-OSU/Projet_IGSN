import { pathSegment } from "./segment.ts";

// The i18n message key for a vocabulary node: the vocabulary prefix plus the
// node's own code (its deepest path segment), e.g. `material_rock`, `type_core`,
// `collection_method_coring`. Domain holds the mapping (shared by admin and
// frontend); each app resolves the key against its own paraglide runtime. A
// segment reused under several parents shares one key, since labels are
// per-segment (.claude/rules/i18n.md).
export function pathLabelKey(prefix: string, path: string): string {
  return `${prefix}_${pathSegment(path)}`;
}
