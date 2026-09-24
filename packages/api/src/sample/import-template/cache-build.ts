export function cacheBuild<T>(build: () => Promise<T>): () => Promise<T> {
  let cached: Promise<T> | undefined;
  return () =>
    (cached ??= build().catch((error: unknown) => {
      cached = undefined;
      throw error;
    }));
}
