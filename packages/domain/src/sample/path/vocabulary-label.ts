// Resolve a vocabulary node's label: the domain owns the key mapping, the
// calling app's message catalog owns the text (i18n rule). Falls back to the
// raw key; each app's spec asserts every tree key resolves.
export function vocabularyLabel(
  labelKey: (path: string) => string,
  messages: Record<string, (() => string) | undefined>,
): (path: string) => string {
  return (path) => {
    const key = labelKey(path);
    return messages[key]?.() ?? key;
  };
}
