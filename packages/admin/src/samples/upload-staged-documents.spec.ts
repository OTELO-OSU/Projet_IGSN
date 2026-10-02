import type { User } from "oidc-client-ts";

import {
  UPLOAD_CHUNK_BYTES,
  UPLOAD_RATE_WINDOW_SECONDS,
} from "@projet-igsn/domain/staged-upload/limits";
import { onTestFinished, vi } from "vitest";

import { fakeTus } from "../../test/fake-tus.ts";
import { userManager } from "../auth/oidc-config.ts";
import {
  type StagedUploadProgress,
  uploadStagedDocuments,
} from "./upload-staged-documents.ts";

const document = (name: string, size = 4, type = "application/pdf") =>
  new File([new Uint8Array(size)], name, { type });

function recordProgress() {
  const snapshots: StagedUploadProgress[] = [];
  return {
    snapshots,
    onProgress: (p: StagedUploadProgress) => snapshots.push(p),
  };
}

function recordStaged() {
  const staged = new Map<string, string>();
  return {
    staged,
    onStaged: (document: File, id: string) => staged.set(document.name, id),
  };
}

describe("uploadStagedDocuments", () => {
  it("should stage the documents one after the other, chunk by chunk, answering each name's staged id", async () => {
    const tus = fakeTus();
    const { staged, onStaged } = recordStaged();

    await uploadStagedDocuments(
      [document("big.pdf", UPLOAD_CHUNK_BYTES + 1), document("notes", 4, "")],
      () => {},
      onStaged,
    );

    expect(tus.requests).toEqual([
      "POST big.pdf application/pdf",
      "PATCH big.pdf 0",
      `PATCH big.pdf ${UPLOAD_CHUNK_BYTES}`,
      "POST notes application/octet-stream",
      "PATCH notes 0",
    ]);
    expect(staged).toEqual(
      new Map([
        ["big.pdf", tus.idOf("big.pdf")],
        ["notes", tus.idOf("notes")],
      ]),
    );
  });

  it("should report each staged id as its file finishes, before a later file fails", async () => {
    let posts = 0;
    const tus = fakeTus({ post: () => (++posts === 2 ? 413 : null) });
    const { staged, onStaged } = recordStaged();

    await expect(
      uploadStagedDocuments(
        [document("report.pdf"), document("photo.jpg")],
        () => {},
        onStaged,
      ),
    ).rejects.toThrow();

    expect(staged).toEqual(new Map([["report.pdf", tus.idOf("report.pdf")]]));
  });

  it("should report the current file's own bytes, starting over at each new file", async () => {
    fakeTus();
    const { snapshots, onProgress } = recordProgress();
    const progress = (
      fileIndex: number,
      currentFileName: string,
      uploadedBytes: number,
      fileSize: number,
    ) => ({
      fileIndex,
      fileCount: 2,
      currentFileName,
      uploadedBytes,
      fileSize,
    });

    await uploadStagedDocuments(
      [document("big.pdf", UPLOAD_CHUNK_BYTES + 1), document("small.pdf")],
      onProgress,
      () => {},
    );

    expect(snapshots[0]).toEqual(
      progress(0, "big.pdf", 0, UPLOAD_CHUNK_BYTES + 1),
    );
    expect(snapshots).toContainEqual(
      progress(0, "big.pdf", UPLOAD_CHUNK_BYTES, UPLOAD_CHUNK_BYTES + 1),
    );
    expect(snapshots).toContainEqual(progress(1, "small.pdf", 0, 4));
    expect(snapshots.at(-1)).toEqual(progress(1, "small.pdf", 4, 4));
  });

  it("should send the token current at each request, never the one read at start", async () => {
    const tus = fakeTus();
    vi.spyOn(userManager, "getUser")
      .mockResolvedValueOnce({ access_token: "first" } as User)
      .mockResolvedValue({ access_token: "renewed" } as User);

    await uploadStagedDocuments(
      [document("report.pdf")],
      () => {},
      () => {},
    );

    expect(tus.authorizations).toEqual(["Bearer first", "Bearer renewed"]);
  });

  it.each([
    { reason: "a 500", answer: 500 },
    { reason: "a 429", answer: 429 },
  ])(
    "should retry a chunk answered by $reason, resuming from the offset the server reports",
    async ({ answer }) => {
      const tus = fakeTus({ patch: (call) => (call === 1 ? answer : null) });
      const { snapshots, onProgress } = recordProgress();
      const { staged, onStaged } = recordStaged();

      await uploadStagedDocuments(
        [document("report.pdf")],
        onProgress,
        onStaged,
      );

      expect(tus.requests).toEqual([
        "POST report.pdf application/pdf",
        "PATCH report.pdf 0",
        "HEAD report.pdf 0",
        "PATCH report.pdf 0",
      ]);
      expect(snapshots.map((p) => p.retryingAttempt)).toContain(2);
      expect(staged).toEqual(new Map([["report.pdf", tus.idOf("report.pdf")]]));
    },
  );

  it("should resume a chunk whose response was lost from the offset HEAD reports, never re-sending it", async () => {
    const tus = fakeTus({ patch: (call) => (call === 1 ? "lost" : null) });
    const { staged, onStaged } = recordStaged();

    await uploadStagedDocuments([document("report.pdf")], () => {}, onStaged);

    expect(tus.requests).toEqual([
      "POST report.pdf application/pdf",
      "PATCH report.pdf 0",
      "HEAD report.pdf 4",
    ]);
    expect(staged).toEqual(new Map([["report.pdf", tus.idOf("report.pdf")]]));
  });

  it("should fail after four attempts at a chunk the server keeps refusing, the last one a whole rate window later", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const tus = fakeTus({ patch: () => 500 });
    const patches = () => tus.requests.filter((r) => r.startsWith("PATCH"));

    const failed = expect(
      uploadStagedDocuments(
        [document("report.pdf")],
        () => {},
        () => {},
      ),
    ).rejects.toThrow();
    for (const [attempt, delayMs] of [
      [1, 1_000],
      [2, 5_000],
      [3, UPLOAD_RATE_WINDOW_SECONDS * 1_000],
    ] as const) {
      await vi.waitFor(() => expect(patches()).toHaveLength(attempt));
      await vi.advanceTimersByTimeAsync(delayMs - 1);
      expect(patches()).toHaveLength(attempt);
      await vi.advanceTimersByTimeAsync(1);
    }

    await failed;
    expect(patches()).toHaveLength(4);
  });

  it("should fail at once on a client error other than 429", async () => {
    const tus = fakeTus({ post: () => 413 });

    await expect(
      uploadStagedDocuments(
        [document("report.pdf")],
        () => {},
        () => {},
      ),
    ).rejects.toThrow();

    expect(tus.requests).toEqual(["POST report.pdf application/pdf"]);
  });
});
