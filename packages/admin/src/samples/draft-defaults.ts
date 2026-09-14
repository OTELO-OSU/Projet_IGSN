export type DraftOptions = { defaults?: boolean };

export const draftDefault = <T>(options: DraftOptions, fallback: T): T =>
  (options.defaults === false ? undefined : fallback) as T;
