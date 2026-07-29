import type { UpdateSampleAttachment } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { FakeXhr } from "../../test/fake-xhr.ts";
import { SampleAttachmentUploadDialog } from "./sample-attachment-upload-dialog.tsx";
import { SampleAttachments } from "./sample-attachments.tsx";
import { useAttachmentChanges } from "./use-attachment-changes.ts";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { access_token: "tok" } }),
}));

const SAMPLE_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const attachment = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3302",
  name: "measurements.csv",
  mediaType: "text/csv",
  description: "Raw measurements",
};

beforeEach(() => {
  FakeXhr.instances = [];
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});

type HarnessProps = {
  attachments: SampleAttachment[];
  onCommit?: (payload: UpdateSampleAttachment[]) => void;
};

// The staging state lives in the hook (owned by the edit page); the Save
// button stands in for the form submit, which uploads the staged files and
// sends the committed payload with the sample update.
function Harness({ attachments, onCommit }: HarnessProps) {
  const changes = useAttachmentChanges(SAMPLE_ID);
  return (
    <>
      <SampleAttachments
        sampleId={SAMPLE_ID}
        attachments={attachments}
        changes={changes}
      />
      <SampleAttachmentUploadDialog changes={changes} />
      <button
        type="button"
        onClick={async () => {
          const payload = await changes.commit(attachments);
          onCommit?.(payload);
        }}
      >
        Save
      </button>
    </>
  );
}

function renderAttachments(
  attachments = [attachment],
  onCommit?: (payload: UpdateSampleAttachment[]) => void,
) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <Harness attachments={attachments} onCommit={onCommit} />
    </QueryClientProvider>,
  );
}

const file = (name: string) =>
  new File(["col1\n1\n"], name, { type: "text/csv" });

const calledUrl = (input: RequestInfo | URL | undefined) => (input as URL).href;

describe("SampleAttachments", () => {
  it("should stage picked files without uploading them", async () => {
    const screen = await renderAttachments([]);

    await screen
      .getByLabelText("Browse files")
      .upload([file("a.csv"), file("b.csv")]);

    await expect.element(screen.getByText("a.csv")).toBeVisible();
    await expect.element(screen.getByText("b.csv")).toBeVisible();
    expect(screen.getByText("New").all()).toHaveLength(2);
    expect(FakeXhr.instances).toHaveLength(0);
  });

  it("should stage files dropped on the zone without uploading them", async () => {
    const screen = await renderAttachments([]);

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file("dropped-1.csv"));
    dataTransfer.items.add(file("dropped-2.csv"));
    const zone = screen
      .getByText("Drag and drop files here, or")
      .element().parentElement!;
    zone.dispatchEvent(
      new DragEvent("drop", { dataTransfer, bubbles: true, cancelable: true }),
    );

    await expect.element(screen.getByText("dropped-1.csv")).toBeVisible();
    await expect.element(screen.getByText("dropped-2.csv")).toBeVisible();
    expect(FakeXhr.instances).toHaveLength(0);
  });

  it("should disable download on a staged file", async () => {
    const screen = await renderAttachments([]);

    await screen.getByLabelText("Browse files").upload([file("a.csv")]);

    await expect
      .element(screen.getByRole("button", { name: "Download a.csv" }))
      .toBeDisabled();
  });

  it("should unstage a file when its remove button is clicked", async () => {
    const screen = await renderAttachments([]);

    await screen
      .getByLabelText("Browse files")
      .upload([file("a.csv"), file("b.csv")]);
    await screen.getByRole("button", { name: "Remove a.csv" }).click();

    expect(screen.getByText("a.csv").query()).toBeNull();
    await expect.element(screen.getByText("b.csv")).toBeVisible();
  });

  it("should upload the staged files on save, showing the progress in a dialog", async () => {
    const screen = await renderAttachments([]);

    await screen
      .getByLabelText("Browse files")
      .upload([file("a.csv"), file("b.csv")]);
    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(2));
    const dialog = screen.getByRole("dialog");
    await expect.element(dialog).toBeVisible();
    await expect
      .element(screen.getByRole("progressbar", { name: "Uploading a.csv" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("progressbar", { name: "Uploading b.csv" }))
      .toBeVisible();
    expect(FakeXhr.instances[0]!.url).toContain(
      `admin/samples/${SAMPLE_ID}/attachments`,
    );
    expect(screen.getByRole("button", { name: "Confirm" }).query()).toBeNull();

    FakeXhr.instances.forEach((xhr) => xhr.finish());
    await expect.element(dialog).toHaveTextContent("Uploaded");
    await screen.getByRole("button", { name: "Confirm" }).click();
    await vi.waitFor(() => expect(dialog.query()).toBeNull());
  });

  it("should upload a staged file with its description and list it in the payload", async () => {
    const onCommit = vi.fn();
    const screen = await renderAttachments([], onCommit);

    await screen.getByLabelText("Browse files").upload([file("a.csv")]);
    await screen.getByLabelText("Description of a.csv").fill("Raw data");

    expect(FakeXhr.instances).toHaveLength(0);

    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    expect(FakeXhr.instances[0]!.body!.get("description")).toBe("Raw data");

    const created = {
      id: "3f2504e0-4f89-41d3-9a0c-0305e82c3303",
      name: "a.csv",
      mediaType: "text/csv",
      description: "Raw data",
    };
    FakeXhr.instances[0]!.finish(201, JSON.stringify({ data: created }));

    await vi.waitFor(() =>
      expect(onCommit).toHaveBeenCalledWith([
        { id: created.id, description: "Raw data" },
      ]),
    );
  });

  it("should recap uploaded and failed files, keeping the failed one staged for retry", async () => {
    const screen = await renderAttachments([]);

    await screen
      .getByLabelText("Browse files")
      .upload([file("a.csv"), file("b.csv")]);
    await screen.getByRole("button", { name: "Save" }).click();
    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(2));
    FakeXhr.instances[0]!.finish();
    FakeXhr.instances[1]!.finish(500);

    const dialog = screen.getByRole("dialog");
    await expect.element(dialog).toHaveTextContent("a.csv");
    await expect.element(dialog).toHaveTextContent("Uploaded");
    await expect.element(dialog).toHaveTextContent("b.csv");
    await expect.element(dialog).toHaveTextContent("Could not upload.");
    await screen.getByRole("button", { name: "Confirm" }).click();

    expect(screen.getByText("a.csv").query()).toBeNull();
    await expect.element(screen.getByText("b.csv")).toBeVisible();
    await expect.element(screen.getByText("Could not upload.")).toBeVisible();

    await screen.getByRole("button", { name: "Save" }).click();
    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(3));
  });

  // The api caps attachment uploads per user (RATE_LIMIT_ADMIN_ATTACHMENT_CREATE),
  // so a legitimate multi-file drop can overflow the budget. The overflow waits
  // out the server's Retry-After instead of being reported as a failure.
  describe("when the upload budget refuses a file", () => {
    beforeEach(() => {
      // setTimeout only: faking Date, performance and rAF as well would trip
      // React and the Radix dialog.
      vi.useFakeTimers({ toFake: ["setTimeout"] });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should hold the file until Retry-After elapses, then upload it", async () => {
      const screen = await renderAttachments([]);

      await screen
        .getByLabelText("Browse files")
        .upload([file("a.csv"), file("b.csv")]);
      await screen.getByRole("button", { name: "Save" }).click();
      await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(2));

      FakeXhr.instances[0]!.finish();
      // The api's real window, far from the 1s fallback retryAfterMs uses when
      // the header is unreadable: a client that cannot see it retries early and
      // fails the wait assertion below.
      FakeXhr.instances[1]!.finish(429, JSON.stringify({ error: "Too many" }), {
        "Retry-After": "60",
      });

      await vi.waitFor(() =>
        expect(
          screen.getByText("Waiting for the upload limit").query(),
        ).not.toBeNull(),
      );
      await vi.advanceTimersByTimeAsync(30_000);
      expect(FakeXhr.instances).toHaveLength(2);

      await vi.advanceTimersByTimeAsync(30_000);
      await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(3));
      FakeXhr.instances[2]!.finish();

      await vi.waitFor(() =>
        expect(screen.getByText("Uploaded").all()).toHaveLength(2),
      );
      expect(screen.getByText("Could not upload.").query()).toBeNull();
      expect(
        screen.getByText("Upload limit reached. Try again shortly.").query(),
      ).toBeNull();
    });

    // The dialog cannot be dismissed and shows no footer while a file waits, so
    // without an announcement a screen-reader user cannot tell waiting from hung.
    it("should announce the wait, keeping a busy indicator", async () => {
      const screen = await renderAttachments([]);

      await screen.getByLabelText("Browse files").upload([file("a.csv")]);
      await screen.getByRole("button", { name: "Save" }).click();
      await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
      FakeXhr.instances[0]!.finish(429, undefined, { "Retry-After": "60" });

      const list = screen.getByRole("dialog").getByRole("list");
      await expect.element(list).toHaveAttribute("aria-live", "polite");
      await expect
        .element(list)
        .toHaveTextContent("Waiting for the upload limit");
      // Sighted users keep a busy affordance: an indeterminate bar, carrying no
      // value and no role of its own since the announced label says it all.
      expect(
        list.element().querySelector("progress:not([value])"),
      ).not.toBeNull();
    });

    // What a cross-origin browser sees if the api ever stops exposing the
    // header: the client must still pace itself rather than hammer the api.
    it("should wait a second when Retry-After is unreadable", async () => {
      const screen = await renderAttachments([]);

      await screen.getByLabelText("Browse files").upload([file("a.csv")]);
      await screen.getByRole("button", { name: "Save" }).click();
      await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
      FakeXhr.instances[0]!.finish(429);

      await vi.advanceTimersByTimeAsync(500);
      expect(FakeXhr.instances).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(500);
      await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(2));
    });

    it("should report a rate-limited upload once the retries run out", async () => {
      const screen = await renderAttachments([]);

      await screen.getByLabelText("Browse files").upload([file("a.csv")]);
      await screen.getByRole("button", { name: "Save" }).click();

      for (let attempt = 1; attempt <= 3; attempt++) {
        await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(attempt));
        // Lowercase, as a real response carries it, and clear of the 1s
        // fallback: a case-sensitive lookup would miss the header, fall back,
        // and have retried by the check below.
        FakeXhr.instances[attempt - 1]!.finish(429, undefined, {
          "retry-after": "5",
        });
        await vi.advanceTimersByTimeAsync(2000);
        expect(FakeXhr.instances).toHaveLength(attempt);

        await vi.advanceTimersByTimeAsync(3000);
      }

      await vi.waitFor(() =>
        expect(
          screen.getByText("Upload limit reached. Try again shortly.").query(),
        ).not.toBeNull(),
      );
      expect(FakeXhr.instances).toHaveLength(3);
    });

    // Retry-After may also be an HTTP date (RFC 9110): Cloudflare or Caddy can
    // refuse before the api does. Read as unparseable, the client would wake a
    // second later and burn its retries against a window still closed.
    it("should honour an HTTP-date Retry-After", async () => {
      const screen = await renderAttachments([]);

      await screen.getByLabelText("Browse files").upload([file("a.csv")]);
      await screen.getByRole("button", { name: "Save" }).click();
      await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
      FakeXhr.instances[0]!.finish(429, undefined, {
        "Retry-After": new Date(Date.now() + 5000).toUTCString(),
      });

      // Whole-second precision, so the real delay is just under five seconds.
      await vi.advanceTimersByTimeAsync(3500);
      expect(FakeXhr.instances).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(2000);
      await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(2));
    });

    // The dialog has no close button while a file is queued, so a window wider
    // than the queue budget must not be waited out at all.
    it("should give up at once when the wait outlasts the queue budget", async () => {
      const screen = await renderAttachments([]);

      await screen.getByLabelText("Browse files").upload([file("a.csv")]);
      await screen.getByRole("button", { name: "Save" }).click();
      await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
      FakeXhr.instances[0]!.finish(429, undefined, { "Retry-After": "600" });

      await expect
        .element(screen.getByText("Upload limit reached. Try again shortly."))
        .toBeVisible();
      // Settled, so the recap is dismissable instead of locked for ten minutes.
      await expect
        .element(screen.getByRole("button", { name: "Confirm" }))
        .toBeVisible();
      expect(FakeXhr.instances).toHaveLength(1);
    });

    it("should add no delay to a drop that fits in the budget", async () => {
      const onCommit = vi.fn();
      const screen = await renderAttachments([], onCommit);

      await screen
        .getByLabelText("Browse files")
        .upload([file("a.csv"), file("b.csv")]);
      await screen.getByRole("button", { name: "Save" }).click();
      await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(2));
      FakeXhr.instances.forEach((xhr) => xhr.finish());

      // No timer is ever advanced: the happy path must not wait on one.
      await vi.waitFor(() => expect(onCommit).toHaveBeenCalled());
      expect(onCommit.mock.calls[0]![0]).toHaveLength(2);
    });
  });

  it("should list the saved attachments", async () => {
    const screen = await renderAttachments();

    await expect.element(screen.getByText("measurements.csv")).toBeVisible();
    await expect
      .element(screen.getByLabelText("Description of measurements.csv"))
      .toHaveValue("Raw measurements");
  });

  it("should say when there is nothing attached", async () => {
    const screen = await renderAttachments([]);

    await expect
      .element(screen.getByText("No attached files yet."))
      .toBeVisible();
  });

  it("should put an edited description in the committed payload without any direct call", async () => {
    const onCommit = vi.fn();
    const fetchSpy = vi.spyOn(window, "fetch");
    const screen = await renderAttachments([attachment], onCommit);

    await screen
      .getByLabelText("Description of measurements.csv")
      .fill("XRF measurements");
    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onCommit).toHaveBeenCalledWith([
        { id: attachment.id, description: "XRF measurements" },
      ]),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should omit a marked attachment from the committed payload without any direct call", async () => {
    const onCommit = vi.fn();
    const fetchSpy = vi.spyOn(window, "fetch");
    const screen = await renderAttachments([attachment], onCommit);

    await screen
      .getByRole("button", { name: "Delete measurements.csv" })
      .click();

    await expect
      .element(screen.getByText("Will be deleted on save."))
      .toBeVisible();

    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() => expect(onCommit).toHaveBeenCalledWith([]));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should keep a marked attachment restored before the save", async () => {
    const onCommit = vi.fn();
    const screen = await renderAttachments([attachment], onCommit);

    await screen
      .getByRole("button", { name: "Delete measurements.csv" })
      .click();
    await screen
      .getByRole("button", { name: "Restore measurements.csv" })
      .click();
    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onCommit).toHaveBeenCalledWith([
        { id: attachment.id, description: "Raw measurements" },
      ]),
    );
  });

  it("should download the attachment through the authed client", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockResolvedValue(new Response(new Blob(["csv"]), { status: 200 }));
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test");
    const screen = await renderAttachments();

    await screen
      .getByRole("button", { name: "Download measurements.csv" })
      .click();

    await vi.waitFor(() => {
      expect(calledUrl(fetchSpy.mock.calls[0]![0])).toContain(
        `admin/samples/${SAMPLE_ID}/attachments/${attachment.id}`,
      );
      expect(createObjectURL).toHaveBeenCalled();
    });
  });
});
