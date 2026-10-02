export const HEADER_ROW = 2;

export const REQUIRED_MARKER = " *";

export const normalisedHeader = (header: string): string => {
  const collapsed = header.trim().replace(/\s+/g, " ");
  return (
    collapsed.endsWith(REQUIRED_MARKER)
      ? collapsed.slice(0, -REQUIRED_MARKER.length)
      : collapsed
  ).toLowerCase();
};
