import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import { TooltipProvider } from "@projet-igsn/design-system/components/ui/tooltip";
import { ATTACHMENT_MAX_BYTES } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import {
  IMPORT_MAX_BYTES,
  IMPORT_TEMPLATE_FILENAME,
  XLSX_MEDIA_TYPE,
} from "@projet-igsn/domain/sample/import/import-validator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { buildAttachmentWorkbook } from "../../test/build-attachment-workbook.ts";
import { fakeTus } from "../../test/fake-tus.ts";
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

type Screen = Awaited<ReturnType<typeof openDialog>>["screen"];
type Dialog = Awaited<ReturnType<typeof openDialog>>["dialog"];

async function pickTemplate(screen: Screen, dialog: Dialog, item: string) {
  await dialog.getByRole("button", { name: "Download template" }).click();
  await screen.getByRole("menuitem", { name: item }).click();
  await expect.poll(() => screen.getByRole("menu").elements()).toHaveLength(0);
}

function drop(target: Element, ...files: File[]) {
  const dataTransfer = new DataTransfer();
  for (const file of files) dataTransfer.items.add(file);
  target.dispatchEvent(
    new DragEvent("drop", { dataTransfer, bubbles: true, cancelable: true }),
  );
}

const attachmentFile = (name: string) =>
  new File(["content"], name, { type: "application/pdf" });

async function dropWorkbookNaming(fileNames: readonly string[]) {
  const opened = await openDialog();
  await opened.dialog
    .getByLabelText("choose one")
    .upload([await buildAttachmentWorkbook(fileNames)]);
  const attachments = opened.dialog.getByRole("list", {
    name: "Attached documents",
  });
  return {
    ...opened,
    addDocuments: (files: File[]) =>
      opened.dialog.getByLabelText("choose them").upload(files),
    dropDocuments: async (files: File[]) => {
      const zone = opened.dialog.getByText("Drop the documents here, or");
      await expect.element(zone).toBeVisible();
      drop(zone.element(), ...files);
    },
    statuses: () =>
      attachments
        .getByRole("listitem")
        .elements()
        .map((item) => item.textContent),
  };
}

const invalidImport = () =>
  HttpResponse.json(
    {
      error: "Invalid import",
      issues: [{ sheet: "Samples", code: "no_sample" }],
    },
    { status: 422 },
  );

function answerNoSample() {
  worker.use(http.post("*/admin/samples/import", invalidImport));
}

function recordImports(answer: () => Response | Promise<Response>) {
  const posted: unknown[][][] = [];
  worker.use(
    http.post("*/admin/samples/import", async ({ request }) => {
      posted.push(
        [...(await request.formData()).entries()].map(([key, value]) => [
          key,
          value instanceof File ? value.name : value,
        ]),
      );
      return answer();
    }),
  );
  return posted;
}

describe("ImportSamplesDialog", () => {
  it("should save the complete template, fetched without customization, the button disabled meanwhile", async () => {
    const { promise: served, resolve: serve } = Promise.withResolvers<void>();
    const requested: string[] = [];
    worker.use(
      http.get("*/admin/samples/import-template", async ({ request }) => {
        requested.push(new URL(request.url).search);
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
    const { screen, dialog } = await openDialog();
    const download = dialog.getByRole("button", { name: "Download template" });

    await pickTemplate(screen, dialog, "Complete template");
    await expect.element(download).toBeDisabled();
    serve();

    await expect.element(download).toBeEnabled();
    expect(requested).toEqual([""]);
    expect(savedNames).toEqual([IMPORT_TEMPLATE_FILENAME]);
    expect(await (createObjectURL.mock.calls[0]![0] as Blob).text()).toBe(
      "template-bytes",
    );
  });

  it("should swap to the customize dialog on Customized template, Back restoring the import dialog", async () => {
    worker.use(
      http.get("*/admin/currentUser/attachable-manual-groups", () =>
        HttpResponse.json({ data: [] }),
      ),
    );
    const { screen, dialog } = await openDialog();

    await pickTemplate(screen, dialog, "Customized template");

    await expect.element(dialog).not.toBeInTheDocument();
    const customize = screen.getByRole("dialog", {
      name: "Customize the template",
    });
    await customize.getByRole("button", { name: "Back" }).click();

    await expect
      .element(screen.getByRole("dialog", { name: "Import samples" }))
      .toBeVisible();
    await expect.element(customize).not.toBeInTheDocument();
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

  it("should block Import until every file the workbook names is added", async () => {
    const { importButton, addDocuments, statuses } = await dropWorkbookNaming([
      "report.pdf",
      "photo.jpg",
    ]);

    await expect
      .poll(statuses)
      .toEqual(["report.pdfMissing", "photo.jpgMissing"]);
    await expect.element(importButton).toBeDisabled();

    await addDocuments([
      attachmentFile("report.pdf"),
      attachmentFile("photo.jpg"),
    ]);

    await expect.poll(statuses).toEqual(["report.pdfAdded", "photo.jpgAdded"]);
    await expect.element(importButton).toBeEnabled();
  });

  it("should list a file the workbook does not name as an error, blocking Import until removed", async () => {
    const { dialog, importButton, addDocuments, statuses } =
      await dropWorkbookNaming(["report.pdf"]);

    await addDocuments([
      attachmentFile("report.pdf"),
      attachmentFile("notes.txt"),
    ]);

    await expect
      .poll(statuses)
      .toEqual(["report.pdfAdded", "notes.txtNot named in the workbook"]);
    await expect.element(importButton).toBeDisabled();

    await dialog.getByRole("button", { name: "Remove notes.txt" }).click();

    await expect.poll(statuses).toEqual(["report.pdfAdded"]);
    await expect.element(importButton).toBeEnabled();
  });

  it.each([
    {
      reason: "the workbook names as a document",
      dropped: "data.xlsx",
      expected: ["data.xlsxAdded"],
    },
    {
      reason: "the workbook does not name as an error",
      dropped: "other.xlsx",
      expected: ["data.xlsxMissing", "other.xlsxNot named in the workbook"],
    },
  ])(
    "should add a dropped xlsx $reason, keeping the workbook",
    async ({ dropped, expected }) => {
      const { dialog, addDocuments, statuses } = await dropWorkbookNaming([
        "data.xlsx",
      ]);
      await expect.poll(statuses).toEqual(["data.xlsxMissing"]);

      await addDocuments([xlsx(dropped)]);

      await expect.poll(statuses).toEqual(expected);
      await expect
        .element(dialog.getByText("samples.xlsx", { exact: true }))
        .toBeVisible();
    },
  );

  it("should clear the workbook and its documents when the workbook is removed", async () => {
    const { dialog, importButton, addDocuments, statuses } =
      await dropWorkbookNaming(["report.pdf"]);
    await addDocuments([attachmentFile("report.pdf")]);
    await expect.poll(statuses).toEqual(["report.pdfAdded"]);

    await dialog
      .getByRole("button", { name: "Remove the workbook samples.xlsx" })
      .click();

    await expect
      .element(dialog.getByLabelText("choose one"))
      .toHaveAttribute("accept", ".xlsx");
    expect(dialog.getByRole("list").elements()).toHaveLength(0);
    expect(dialog.getByText("samples.xlsx").elements()).toHaveLength(0);
    await expect.element(importButton).toBeDisabled();
  });

  it("should reject a file whose name is already added", async () => {
    const { dialog, addDocuments, statuses } = await dropWorkbookNaming([
      "report.pdf",
    ]);
    await addDocuments([attachmentFile("report.pdf")]);
    await expect.poll(statuses).toEqual(["report.pdfAdded"]);

    await addDocuments([attachmentFile("report.pdf")]);

    await expect
      .element(dialog.getByRole("alert"))
      .toHaveTextContent("report.pdf is already added.");
    expect(statuses()).toEqual(["report.pdfAdded"]);
  });

  it("should reject a document over the attachment size limit, its name staying missing", async () => {
    const { dialog, importButton, statuses } = await dropWorkbookNaming([
      "report.pdf",
    ]);
    await expect.poll(statuses).toEqual(["report.pdfMissing"]);
    const oversized = attachmentFile("report.pdf");
    Object.defineProperty(oversized, "size", {
      value: ATTACHMENT_MAX_BYTES + 1,
    });

    drop(dialog.getByText("Drop the documents here, or").element(), oversized);

    await expect
      .element(dialog.getByRole("alert"))
      .toHaveTextContent("report.pdf is larger than 100 MB.");
    expect(statuses()).toEqual(["report.pdfMissing"]);
    await expect.element(importButton).toBeDisabled();
  });

  it("should post the workbook and the staged ids of its documents", async () => {
    const tus = fakeTus();
    const posted = recordImports(() => HttpResponse.json({ count: 1 }));
    const { importButton, addDocuments } = await dropWorkbookNaming([
      "report.pdf",
      "photo.jpg",
    ]);
    await addDocuments([
      attachmentFile("report.pdf"),
      attachmentFile("photo.jpg"),
    ]);

    await importButton.click();

    await expect.poll(() => posted).toHaveLength(1);
    expect(posted).toEqual([
      [
        ["file", "samples.xlsx"],
        ["stagedUploadIds[]", tus.idOf("report.pdf")],
        ["stagedUploadIds[]", tus.idOf("photo.jpg")],
      ],
    ]);
  });

  it("should show one bar following the current file, named with its retry, then the next file, then the import step", async () => {
    fakeTus({ patch: (call) => (call === 1 ? 500 : null) });
    const retriedChunk = Promise.withResolvers<void>();
    const secondFileChunk = Promise.withResolvers<void>();
    let patches = 0;
    worker.use(
      http.patch("*/admin/samples/import/uploads/:id", async () => {
        patches += 1;
        if (patches === 2) await retriedChunk.promise;
        if (patches === 3) await secondFileChunk.promise;
      }),
    );
    const { promise: importHeld, resolve: releaseImport } =
      Promise.withResolvers<void>();
    recordImports(async () => {
      await importHeld;
      return HttpResponse.json({ count: 1 });
    });
    const { screen, dialog, importButton, addDocuments } =
      await dropWorkbookNaming(["report.pdf", "photo.jpg"]);
    await addDocuments([
      attachmentFile("report.pdf"),
      new File(["photo content"], "photo.jpg", { type: "image/jpeg" }),
    ]);

    await importButton.click();

    const upload = screen.getByRole("dialog", { name: "Importing samples" });
    const bar = upload.getByRole("progressbar", {
      name: "Uploading the documents",
    });
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(bar).toHaveAttribute("max", "7");
    await expect
      .element(
        upload.getByText("File 1/2: report.pdf, retrying (attempt 2 of 4)"),
        { timeout: 3_000 },
      )
      .toBeVisible();
    retriedChunk.resolve();
    await expect
      .element(upload.getByText("File 2/2: photo.jpg", { exact: true }))
      .toBeVisible();
    await expect.element(bar).toHaveAttribute("max", "13");
    expect(upload.getByRole("progressbar").elements()).toHaveLength(1);
    secondFileChunk.resolve();
    await expect
      .element(
        upload.getByRole("progressbar", { name: "Creating the samples" }),
      )
      .toBeVisible();
    releaseImport();
    await expect.element(upload).not.toBeInTheDocument();
  });

  it("should reopen the import dialog with its report after a 422, a resubmit posting the same staged ids without uploading again", async () => {
    const tus = fakeTus();
    const posted = recordImports(invalidImport);
    const { dialog, importButton, addDocuments, statuses } =
      await dropWorkbookNaming(["report.pdf"]);
    await addDocuments([attachmentFile("report.pdf")]);

    await importButton.click();

    await expect
      .element(dialog.getByRole("table", { name: "Samples" }))
      .toHaveTextContent("The file holds no sample.");
    expect(statuses()).toEqual(["report.pdfAdded"]);
    await importButton.click();
    await expect.poll(() => posted).toHaveLength(2);
    const entries = [
      ["file", "samples.xlsx"],
      ["stagedUploadIds[]", tus.idOf("report.pdf")],
    ];
    expect(posted).toEqual([entries, entries]);
    expect(tus.requests).toEqual([
      "POST report.pdf application/pdf",
      "PATCH report.pdf 0",
    ]);
  });

  it("should keep the documents staged before a failed upload, Import again staging only the rest", async () => {
    let posts = 0;
    const tus = fakeTus({ post: () => (++posts === 2 ? 413 : null) });
    const posted = recordImports(() => HttpResponse.json({ count: 1 }));
    const { dialog, importButton, dropDocuments } = await dropWorkbookNaming([
      "report.pdf",
      "photo.jpg",
    ]);
    await dropDocuments([
      attachmentFile("report.pdf"),
      attachmentFile("photo.jpg"),
    ]);
    await importButton.click();
    await expect.element(dialog).toBeVisible();

    await importButton.click();

    await expect.poll(() => posted).toHaveLength(1);
    expect(tus.requests.filter((r) => r.startsWith("POST"))).toEqual([
      "POST report.pdf application/pdf",
      "POST photo.jpg application/pdf",
      "POST photo.jpg application/pdf",
    ]);
    expect(posted[0]).toEqual([
      ["file", "samples.xlsx"],
      ["stagedUploadIds[]", tus.idOf("report.pdf")],
      ["stagedUploadIds[]", tus.idOf("photo.jpg")],
    ]);
  });

  it("should re-stage after a 422 only the document replaced by another file", async () => {
    const tus = fakeTus();
    const posted = recordImports(invalidImport);
    const photo = attachmentFile("photo.jpg");
    const { dialog, importButton, dropDocuments } = await dropWorkbookNaming([
      "report.pdf",
      "photo.jpg",
    ]);
    await dropDocuments([attachmentFile("report.pdf"), photo]);
    await importButton.click();
    await expect.element(dialog.getByRole("table")).toBeVisible();

    await dialog
      .getByRole("button", { name: "Remove the workbook samples.xlsx" })
      .click();
    await dialog
      .getByLabelText("choose one")
      .upload([await buildAttachmentWorkbook(["report.pdf", "photo.jpg"])]);
    await dropDocuments([
      new File(["revised content"], "report.pdf", { type: "application/pdf" }),
      photo,
    ]);
    await importButton.click();

    await expect.poll(() => posted).toHaveLength(2);
    expect(tus.requests.filter((r) => r.startsWith("POST"))).toEqual([
      "POST report.pdf application/pdf",
      "POST photo.jpg application/pdf",
      "POST report.pdf application/pdf",
    ]);
    expect(posted[1]).toEqual([
      ["file", "samples.xlsx"],
      ["stagedUploadIds[]", tus.idOf("report.pdf", 1)],
      ["stagedUploadIds[]", tus.idOf("photo.jpg")],
    ]);
  });

  it.each([
    {
      ending: "a successful import",
      answer: () => HttpResponse.json({ count: 1 }),
      settle: (dialog: Dialog) =>
        expect.element(dialog).not.toBeInTheDocument(),
    },
    {
      ending: "closing the dialog after a 422",
      answer: invalidImport,
      settle: async (dialog: Dialog) => {
        await expect.element(dialog.getByRole("table")).toBeVisible();
        await dialog.getByRole("button", { name: "Cancel" }).click();
      },
    },
  ])(
    "should stage the documents again after $ending",
    async ({ answer, settle }) => {
      const tus = fakeTus();
      const posted = recordImports(answer);
      const report = attachmentFile("report.pdf");
      const { screen, dialog, importButton, dropDocuments } =
        await dropWorkbookNaming(["report.pdf"]);
      await dropDocuments([report]);
      await importButton.click();
      await settle(dialog);

      await screen.getByRole("button", { name: "Import" }).click();
      await dialog
        .getByLabelText("choose one")
        .upload([await buildAttachmentWorkbook(["report.pdf"])]);
      await dropDocuments([report]);
      await importButton.click();

      await expect.poll(() => posted).toHaveLength(2);
      expect(tus.requests.filter((r) => r.startsWith("POST"))).toEqual([
        "POST report.pdf application/pdf",
        "POST report.pdf application/pdf",
      ]);
    },
  );
});
