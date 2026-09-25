let tail: Promise<unknown> = Promise.resolve();

export function queueBuild<T>(build: () => Promise<T>): Promise<T> {
  const result = tail.then(build);
  tail = result.catch(() => undefined);
  return result;
}
