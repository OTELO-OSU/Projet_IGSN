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

  it("should omit a marked attachment from the committed payload without any direct call", async () => {
    const onCommit = vi.fn();
    const fetchSpy = vi.spyOn(window, "fetch");
    const screen = await renderAttachments([attachment], onCommit);

    await screen
      .getByRole("button", { name: "Delete measurements.csv" })
      .click();

    // Marked, flagged, but nothing sent and nothing committed yet.
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
