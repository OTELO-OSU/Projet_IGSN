import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SampleAttachments } from "./sample-attachments.tsx";

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

// The upload hook talks XHR (fetch has no upload progress); this fake records
// each instance and lets a test drive progress and completion by hand.
class FakeXhr {
  static instances: FakeXhr[] = [];
  upload: {
    onprogress:
      | ((event: {
          lengthComputable: boolean;
          loaded: number;
          total: number;
        }) => void)
      | null;
  } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  status = 0;
  url = "";
  body: FormData | null = null;
  open(_method: string, url: string) {
    this.url = url;
  }
  setRequestHeader() {}
  send(body: FormData) {
    this.body = body;
    FakeXhr.instances.push(this);
  }
  finish(status = 201) {
    this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 2 });
    this.status = status;
    this.onload?.();
  }
}

beforeEach(() => {
  FakeXhr.instances = [];
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});

function renderAttachments(attachments = [attachment]) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SampleAttachments sampleId={SAMPLE_ID} attachments={attachments} />
    </QueryClientProvider>,
  );
}

const file = (name: string) =>
  new File([new TextEncoder().encode("col1\n1\n")], name, {
    type: "text/csv",
  });

const calledUrl = (input: RequestInfo | URL | undefined) =>
  input instanceof Request ? input.url : String(input);

describe("SampleAttachments", () => {
  it("should upload every picked file, showing a progress bar each", async () => {
    const screen = await renderAttachments([]);

    await screen
      .getByLabelText("Browse files")
      .upload([file("a.csv"), file("b.csv")]);

    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(2));
    await expect
      .element(screen.getByRole("progressbar", { name: "Uploading a.csv" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("progressbar", { name: "Uploading b.csv" }))
      .toBeVisible();
    expect(FakeXhr.instances[0]!.url).toContain(
      `admin/samples/${SAMPLE_ID}/attachments`,
    );

    FakeXhr.instances.forEach((xhr) => xhr.finish());
    await vi.waitFor(() =>
      expect(
        screen.getByRole("progressbar", { name: /Uploading/ }).query(),
      ).toBeNull(),
    );
  });

  it("should upload files dropped on the zone", async () => {
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

    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(2));
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

  it("should save an edited description on blur", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const screen = await renderAttachments();

    const input = screen.getByLabelText("Description of measurements.csv");
    await input.fill("XRF measurements");
    // Clicking elsewhere blurs the input, which triggers the save.
    await screen.getByText("measurements.csv").click();

    await vi.waitFor(() => {
      const call = fetchSpy.mock.calls.find(
        ([, init]) => init?.method === "PUT",
      );
      expect(call).toBeDefined();
      expect(calledUrl(call![0])).toContain(
        `admin/samples/${SAMPLE_ID}/attachments/${attachment.id}`,
      );
      expect(call![1]!.body).toBe(
        JSON.stringify({ description: "XRF measurements" }),
      );
    });
  });

  it("should delete the attachment after confirmation", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    const screen = await renderAttachments();

    await screen
      .getByRole("button", { name: "Delete measurements.csv" })
      .click();
    await screen.getByRole("button", { name: "Confirm" }).click();

    await vi.waitFor(() => {
      const call = fetchSpy.mock.calls.find(
        ([, init]) => init?.method === "DELETE",
      );
      expect(call).toBeDefined();
      expect(calledUrl(call![0])).toContain(
        `admin/samples/${SAMPLE_ID}/attachments/${attachment.id}`,
      );
    });
  });

  it("should download the attachment through the authed client", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockResolvedValue(new Response(new Blob(["csv"]), { status: 200 }));
    const createObjectURL = vi.fn(() => "blob:test");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL }));
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
