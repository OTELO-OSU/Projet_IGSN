// Location and material are inherited from a sole parent only; two parents inherit nothing (ADR 0039).
export const soleParent = <T>(parents: readonly T[]): T | undefined =>
  parents.length === 1 ? parents[0] : undefined;
