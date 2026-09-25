import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import {
  IMPORT_MAX_BYTES,
  IMPORT_TEMPLATE_FILENAME,
  XLSX_MEDIA_TYPE,
} from "@projet-igsn/domain/sample/import/import-validator";
import { HttpResponse, http } from "msw";
import { vi } from "vitest";

import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { ImportSamplesDialog } from "./import-samples-dialog.tsx";

const xlsx = (name = "samples.xlsx", size = 4) =>
  new File([new Uint8Array(size)], name, { type: XLSX_MEDIA_TYPE });

async function openDialog() {
  const screen = await render(
    <>
      <ImportSamplesDialog />
      <Toaster />
    </>,
  );
  await screen.getByRole("button", { name: "Import" }).click();
  const dialog = screen.getByRole("dialog", { name: "Import samples" });
  return {
    screen,
    dialog,
    importButton: dialog.getByRole("button", { name: "Import" }),
  };
}

function drop(target: Element, file: File) {
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  target.dispatchEvent(
    new DragEvent("drop", { dataTransfer, bubbles: true, cancelable: true }),
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

  it("should post the file as form data, confirm and close", async () => {
    const posted: unknown[] = [];
    worker.use(
      http.post("*/admin/samples/import", async ({ request }) => {
        const file = (await request.formData()).get("file") as File;
        posted.push({ name: file.name, type: file.type });
        return new HttpResponse(null, { status: 202 });
      }),
    );
    const { screen, dialog, importButton } = await openDialog();
    await dialog.getByLabelText("choose one").upload([xlsx()]);

    await importButton.click();

    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent(
        "File received. Its samples will be imported in a later version.",
      );
    expect(screen.getByRole("dialog").elements()).toHaveLength(0);
    expect(posted).toEqual([{ name: "samples.xlsx", type: XLSX_MEDIA_TYPE }]);
  });

  it.each([415, 500])(
    "should keep the dialog open with its file when the api answers %i",
    async (status) => {
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
        .toHaveTextContent("The file could not be imported.");
      await expect.element(dialog.getByText("samples.xlsx")).toBeVisible();
    },
  );
});
