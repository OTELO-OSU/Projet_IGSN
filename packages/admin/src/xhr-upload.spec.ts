import { afterEach, vi } from "vitest";

import { FakeXhr } from "../test/fake-xhr.ts";
import { xhrUpload } from "./xhr-upload.ts";

afterEach(() => vi.useRealTimers());

describe("xhrUpload", () => {
  it("should retry a network error after a delay, reporting percent progress from 0 at each attempt", async () => {
    vi.useFakeTimers();
    FakeXhr.instances = [];
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const progress: number[] = [];
    const attempts: number[] = [];

    const upload = xhrUpload("/upload", "tok", new FormData(), {
      onProgress: (percent) => progress.push(percent),
      onAttempt: (attempt) => attempts.push(attempt),
    });
    FakeXhr.instances[0]!.upload.onprogress?.({
      lengthComputable: true,
      loaded: 1,
      total: 4,
    });
    FakeXhr.instances[0]!.onerror?.();
    await vi.advanceTimersByTimeAsync(999);
    expect(FakeXhr.instances).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    FakeXhr.instances[1]!.finish(201, "created");

    expect(await upload).toEqual({ status: 201, responseText: "created" });
    expect(progress).toEqual([0, 25, 0, 50]);
    expect(attempts).toEqual([1, 2]);
  });
});
