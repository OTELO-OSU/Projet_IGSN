export function vocabularyLabel<T = string>(
  labelKey: (value: T) => string,
  messages: Record<string, (() => string) | undefined>,
): (value: T) => string {
  return (value) => {
    const key = labelKey(value);
    return messages[key]?.() ?? key;
  };
}
