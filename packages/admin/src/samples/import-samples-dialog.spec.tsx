import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import { TooltipProvider } from "@projet-igsn/design-system/components/ui/tooltip";
import {
  IMPORT_MAX_BYTES,
  IMPORT_TEMPLATE_FILENAME,
  XLSX_MEDIA_TYPE,
} from "@projet-igsn/domain/sample/import/import-validator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { worker } from "../../test/msw.ts";
import { ImportSamplesDialog } from "./import-samples-dialog.tsx";

const xlsx = (name = "samples.xlsx", size = 4) =>
  new File([new Uint8Array(size)], name, { type: XLSX_MEDIA_TYPE });

const SAMPLE_LIST_KEY = ["samples", { moderated: false }];

async function openDialog() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(SAMPLE_LIST_KEY, { data: [], meta: { total: 0 } });
  const screen = await render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ImportSamplesDialog />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  await screen.getByRole("button", { name: "Import" }).click();
  const dialog = screen.getByRole("dialog", { name: "Import samples" });
  return {
    queryClient,
    screen,
    dialog,
    importButton: dialog.getByRole("button", { name: "Import" }),
  };
}

async function openReserveDialog() {
  const { screen, dialog } = await openDialog();
  await dialog.getByRole("button", { name: "Reserve internal IDs" }).click();
  return {
    reserveDialog: screen.getByRole("dialog", { name: "Reserve internal IDs" }),
  };
}

function drop(target: Element, file: File) {
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  target.dispatchEvent(
    new DragEvent("drop", { dataTransfer, bubbles: true, cancelable: true }),
  );
}

function answerNoSample() {
  worker.use(
    http.post("*/admin/samples/import", () =>
      HttpResponse.json(
        {
          error: "Invalid import",
          issues: [{ sheet: "Samples", code: "no_sample" }],
        },
        { status: 422 },
      ),
    ),
  );
}

describe("ImportSamplesDialog", () => {
  it("should open the import dialog from the Import button", async () => {
    const { dialog } = await openDialog();

    await expect
      .element(dialog)
      .toHaveTextContent(
        "To import samples in bulk, download the template, fill it in and upload it.",
      );
  });

  it("should save the downloaded template, the button disabled meanwhile", async () => {
    const { promise: served, resolve: serve } = Promise.withResolvers<void>();
    worker.use(
      http.get("*/admin/samples/import-template", async () => {
        await served;
        return new HttpResponse("template-bytes");
      }),
    );
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test");
    const savedNames: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function (this: HTMLAnchorElement) {
        savedNames.push(this.download);
      },
    );
    const { dialog } = await openDialog();
    const download = dialog.getByRole("button", { name: "Download template" });

    await download.click();
    await expect.element(download).toBeDisabled();
    serve();

    await expect.element(download).toBeEnabled();
    expect(savedNames).toEqual([IMPORT_TEMPLATE_FILENAME]);
    expect(await (createObjectURL.mock.calls[0]![0] as Blob).text()).toBe(
      "template-bytes",
    );
  });

  it("should require a count before reserving internal IDs", async () => {
    const posted: unknown[] = [];
    worker.use(
      http.post(
        "*/admin/samples/import-template/reservation",
        ({ request }) => {
          posted.push(request.url);
          return new HttpResponse("reserved-bytes");
        },
      ),
    );
    const { reserveDialog } = await openReserveDialog();

    await reserveDialog.getByLabelText("Number of internal IDs").clear();
    await reserveDialog
      .getByRole("button", { name: "Download template with reserved IDs" })
      .click();

    await expect
      .element(reserveDialog.getByRole("alert"))
      .toHaveTextContent("Enter a number from 1 to 500.");
    expect(posted).toEqual([]);
  });

  it("should post the reserved count and save the template it answers", async () => {
    const posted: unknown[] = [];
    worker.use(
      http.post(
        "*/admin/samples/import-template/reservation",
        async ({ request }) => {
          posted.push(await request.json());
          return new HttpResponse("reserved-bytes");
        },
      ),
    );
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const { reserveDialog } = await openReserveDialog();

    await reserveDialog.getByLabelText("Number of internal IDs").fill("3");
    await reserveDialog
      .getByRole("button", { name: "Download template with reserved IDs" })
      .click();

    await expect.poll(() => posted).toEqual([{ count: 3 }]);
    await expect.poll(() => createObjectURL.mock.calls.length).toBe(1);
    expect(await (createObjectURL.mock.calls[0]![0] as Blob).text()).toBe(
      "reserved-bytes",
    );
  });

  it("should enable Import once an xlsx file is picked, showing its name", async () => {
    const { dialog, importButton } = await openDialog();
    await expect.element(importButton).toBeDisabled();

    await dialog.getByLabelText("choose one").upload([xlsx()]);

    await expect.element(dialog.getByText("samples.xlsx")).toBeVisible();
    await expect.element(importButton).toBeEnabled();
  });

  it.each([
    {
      reason: "a csv",
      file: new File(["a,b\n"], "samples.csv", { type: "text/csv" }),
      error: "This file is not an Excel .xlsx file.",
    },
    {
      reason: "an oversized xlsx",
      file: xlsx("big.xlsx", IMPORT_MAX_BYTES + 1),
      error: "This file is larger than 20 MB.",
    },
  ])(
    "should reject $reason inline and keep Import disabled",
    async ({ file, error }) => {
      const { dialog, importButton } = await openDialog();

      drop(dialog.getByText("Drop an Excel file here, or").element(), file);

      await expect.element(dialog.getByRole("alert")).toHaveTextContent(error);
      await expect.element(importButton).toBeDisabled();
    },
  );

  it("should post the file as form data, confirm the count, close and refresh the list", async () => {
    const posted: unknown[] = [];
    worker.use(
      http.post("*/admin/samples/import", async ({ request }) => {
        const file = (await request.formData()).get("file") as File;
        posted.push({ name: file.name, type: file.type });
        return HttpResponse.json({ count: 3 });
      }),
    );
    const { queryClient, screen, dialog, importButton } = await openDialog();
    await dialog.getByLabelText("choose one").upload([xlsx()]);

    await importButton.click();

    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent(
        "3 samples imported. Publication is running in the background.",
      );
    expect(screen.getByRole("dialog").elements()).toHaveLength(0);
    expect(posted).toEqual([{ name: "samples.xlsx", type: XLSX_MEDIA_TYPE }]);
    expect(queryClient.getQueryState(SAMPLE_LIST_KEY)?.isInvalidated).toBe(
      true,
    );
  });

  it("should report an invalid file in the open dialog without a toast, until another file is picked", async () => {
    answerNoSample();
    const { screen, dialog, importButton } = await openDialog();
    await dialog.getByLabelText("choose one").upload([xlsx()]);

    await importButton.click();

    const report = dialog.getByRole("table", { name: "Samples" });
    await expect.element(report).toHaveTextContent("The file holds no sample.");
    expect(
      screen.getByRole("region", { name: /notifications/i }).element()
        .textContent,
    ).toBe("");

    await dialog.getByLabelText("choose one").upload([xlsx("fixed.xlsx")]);

    await expect.element(dialog.getByText("fixed.xlsx")).toBeVisible();
    await expect.element(report).not.toBeInTheDocument();
  });

  it("should clear the report when the dialog is closed", async () => {
    answerNoSample();
    const { screen, dialog, importButton } = await openDialog();
    await dialog.getByLabelText("choose one").upload([xlsx()]);
    await importButton.click();
    await expect.element(dialog.getByRole("table")).toBeVisible();

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await screen.getByRole("button", { name: "Import" }).click();

    await expect
      .element(screen.getByRole("dialog", { name: "Import samples" }))
      .toBeVisible();
    expect(screen.getByRole("table").elements()).toHaveLength(0);
  });

  it.each([
    [415, "The file could not be imported."],
    [500, "The file could not be imported."],
    [503, "DataCite is unreachable. Nothing was imported, try again later."],
  ])(
    "should keep the dialog open with its file when the api answers %i",
    async (status, message) => {
      worker.use(
        http.post(
          "*/admin/samples/import",
          () => new HttpResponse(null, { status }),
        ),
      );
      const { screen, dialog, importButton } = await openDialog();
      await dialog.getByLabelText("choose one").upload([xlsx()]);

      await importButton.click();

      await expect
        .element(screen.getByRole("region", { name: /notifications/i }))
        .toHaveTextContent(message);
      await expect.element(dialog.getByText("samples.xlsx")).toBeVisible();
    },
  );
});
