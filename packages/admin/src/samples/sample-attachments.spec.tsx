import type { UpdateSampleAttachment } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";

import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import { DEFAULT_UPLOAD_LIMIT } from "@projet-igsn/domain/sample/attachment/attachment-validator";
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
  const changes = useAttachmentChanges(SAMPLE_ID, attachments.length);
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
      <Toaster />
    </>
  );
}

// Saved attachments, as many as asked: the limit cases need a full sample.
const savedAttachments = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    ...attachment,
    id: `3f2504e0-4f89-41d3-9a0c-03050000000${i}`,
    name: `saved-${i}.csv`,
  }));

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
    // Staged files carry a badge telling them apart from saved attachments.
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
    // No way to dismiss the dialog while uploads are running.
    expect(screen.getByRole("button", { name: "Confirm" }).query()).toBeNull();

    // The dialog stays open on the recap until the user confirms it.
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

    // Edited locally, nothing sent yet.
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

    // The dialog stays open with the recap until the user closes it.
    const dialog = screen.getByRole("dialog");
    await expect.element(dialog).toHaveTextContent("a.csv");
    await expect.element(dialog).toHaveTextContent("Uploaded");
    await expect.element(dialog).toHaveTextContent("b.csv");
    await expect.element(dialog).toHaveTextContent("Could not upload.");
    await screen.getByRole("button", { name: "Confirm" }).click();

    // The uploaded file left the staging list; the failed one stays, flagged.
    expect(screen.getByText("a.csv").query()).toBeNull();
    await expect.element(screen.getByText("b.csv")).toBeVisible();
    await expect.element(screen.getByText("Could not upload.")).toBeVisible();

    // Saving again retries only the failed file.
    await screen.getByRole("button", { name: "Save" }).click();
    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(3));
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

  it("should omit a marked attachment from the committed payload, deleting it on save only", async () => {
    const onCommit = vi.fn();
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    const screen = await renderAttachments([attachment], onCommit);

    await screen
      .getByRole("button", { name: "Delete measurements.csv" })
      .click();

    // Marked, flagged, but nothing sent and nothing committed yet: cancelling
    // now would leave the server untouched.
    await expect
      .element(screen.getByText("Will be deleted on save."))
      .toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();

    await screen.getByRole("button", { name: "Save" }).click();

    // The save deletes it for real, and the payload no longer lists it.
    await vi.waitFor(() => expect(onCommit).toHaveBeenCalledWith([]));
    expect(calledUrl(fetchSpy.mock.calls[0]![0])).toContain(
      `admin/samples/${SAMPLE_ID}/attachments/${attachment.id}`,
    );
    expect(fetchSpy.mock.calls[0]![1]?.method).toBe("DELETE");
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

  it("should show the attachment count against the limit", async () => {
    const screen = await renderAttachments(
      savedAttachments(DEFAULT_UPLOAD_LIMIT),
    );

    await expect.element(screen.getByText("5 of 5 files")).toBeVisible();
  });

  it("should refuse a file picked when the sample is already full", async () => {
    const screen = await renderAttachments(
      savedAttachments(DEFAULT_UPLOAD_LIMIT),
    );

    await screen.getByLabelText("Browse files").upload([file("extra.csv")]);

    expect(screen.getByText("extra.csv").query()).toBeNull();
    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("You cannot attach more than 5 files");
  });

  it("should warn once when several files are picked on a full sample", async () => {
    const screen = await renderAttachments(
      savedAttachments(DEFAULT_UPLOAD_LIMIT),
    );

    await screen
      .getByLabelText("Browse files")
      .upload([file("a.csv"), file("b.csv"), file("c.csv")]);

    expect(screen.getByText("a.csv").query()).toBeNull();
    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("You cannot attach more than 5 files");
    expect(
      screen.getByText(/cannot attach more than 5 files/).all(),
    ).toHaveLength(1);
  });

  it("should stage only the files that fit under the limit", async () => {
    const screen = await renderAttachments(
      savedAttachments(DEFAULT_UPLOAD_LIMIT - 1),
    );

    await screen
      .getByLabelText("Browse files")
      .upload([file("a.csv"), file("b.csv"), file("c.csv")]);

    await expect.element(screen.getByText("a.csv")).toBeVisible();
    expect(screen.getByText("b.csv").query()).toBeNull();
    expect(screen.getByText("c.csv").query()).toBeNull();
  });

  it("should swap a file in one save when the sample is full", async () => {
    const onCommit = vi.fn();
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    const saved = savedAttachments(DEFAULT_UPLOAD_LIMIT);
    const screen = await renderAttachments(saved, onCommit);

    await screen.getByRole("button", { name: "Delete saved-0.csv" }).click();
    await screen.getByLabelText("Browse files").upload([file("new.csv")]);
    // exact: the "saved-N.csv" row buttons also contain "save".
    await screen.getByRole("button", { name: "Save", exact: true }).click();

    // The staged deletion frees its slot on the server BEFORE the upload
    // starts, so the api still has room and does not refuse the new file.
    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    expect(calledUrl(fetchSpy.mock.calls[0]![0])).toContain(
      `admin/samples/${SAMPLE_ID}/attachments/${saved[0]!.id}`,
    );
    expect(fetchSpy.mock.calls[0]![1]?.method).toBe("DELETE");

    FakeXhr.instances[0]!.finish();

    // One save, and the sample keeps 5 files: the 4 survivors plus the new one.
    await vi.waitFor(() => expect(onCommit).toHaveBeenCalled());
    expect(onCommit.mock.calls[0]![0]).toHaveLength(DEFAULT_UPLOAD_LIMIT);
    await expect
      .element(screen.getByText("Could not upload."))
      .not.toBeInTheDocument();
  });

  it("should free a slot when a saved attachment is marked for deletion", async () => {
    const screen = await renderAttachments(
      savedAttachments(DEFAULT_UPLOAD_LIMIT),
    );

    await screen.getByRole("button", { name: "Delete saved-0.csv" }).click();
    await screen.getByLabelText("Browse files").upload([file("extra.csv")]);

    await expect.element(screen.getByText("extra.csv")).toBeVisible();
  });

  it("should refuse restoring an attachment whose freed slot is taken", async () => {
    const screen = await renderAttachments(
      savedAttachments(DEFAULT_UPLOAD_LIMIT),
    );

    await screen.getByRole("button", { name: "Delete saved-0.csv" }).click();
    await screen.getByLabelText("Browse files").upload([file("extra.csv")]);
    await screen.getByRole("button", { name: "Restore saved-0.csv" }).click();

    // Still marked for deletion, and the user is told why.
    await expect
      .element(screen.getByText("Will be deleted on save."))
      .toBeVisible();
    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("You cannot attach more than 5 files");
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
