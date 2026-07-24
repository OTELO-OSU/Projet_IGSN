// Resolve a vocabulary node's label: the domain owns the key mapping, the
// calling app's message catalog owns the text (i18n rule). Falls back to the
// raw key; each app's spec asserts every tree key resolves.
//
// `messages` is intentionally the loose `Record<string, ...>`, not `Messages`:
// tree label keys are computed from runtime string paths, so they must be
// looked up by `string`, which the key-narrowed `Messages` type forbids.
export function vocabularyLabel<T = string>(
  labelKey: (value: T) => string,
  messages: Record<string, (() => string) | undefined>,
): (value: T) => string {
  return (value) => {
    const key = labelKey(value);
    return messages[key]?.() ?? key;
  };
}
