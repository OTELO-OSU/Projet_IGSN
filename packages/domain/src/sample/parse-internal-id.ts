export function parseInternalId(text: string): number | undefined {
  const digits = /^sample-(\d+)$/.exec(text.trim())?.[1];
  const internalNumber = Number(digits);
  return Number.isSafeInteger(internalNumber) && internalNumber > 0
    ? internalNumber
    : undefined;
}
