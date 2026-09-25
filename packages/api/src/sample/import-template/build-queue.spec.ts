import { describe, expect, it, vi } from "vitest";

import { queueBuild } from "./build-queue.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

describe("queueBuild", () => {
  it("should hold the next build until the one in flight settles", async () => {
    const started = deferred<void>();
    const inFlight = deferred<string>();
    const next = vi.fn(() => Promise.resolve("next"));

    const firstResult = queueBuild(() => {
      started.resolve();
      return inFlight.promise;
    });
    const nextResult = queueBuild(next);

    await started.promise;
    expect(next).not.toHaveBeenCalled();

    inFlight.resolve("first");

    await expect(firstResult).resolves.toBe("first");
    await expect(nextResult).resolves.toBe("next");
  });

  it("should run the next build after one rejects, and still reject its own caller", async () => {
    const failure = new Error("build failed");

    const firstResult = queueBuild(() => Promise.reject(failure));
    const nextResult = queueBuild(() => Promise.resolve("next"));

    await expect(firstResult).rejects.toBe(failure);
    await expect(nextResult).resolves.toBe("next");
  });
});
