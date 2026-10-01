import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import { TooltipProvider } from "@projet-igsn/design-system/components/ui/tooltip";
import { XLSX_MEDIA_TYPE } from "@projet-igsn/domain/sample/import/import-validator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { render } from "vitest-browser-react";

import { worker } from "../../test/msw.ts";
import { BulkEditDialog } from "./bulk-edit-dialog.tsx";

const SAMPLE_LIST_KEY = ["samples", { moderated: false }];

async function openDialog() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(SAMPLE_LIST_KEY, { data: [], meta: { total: 0 } });
  const screen = await render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BulkEditDialog
          exportRequest={{ mode: "filters", moderated: false, query: {} }}
        />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  await screen.getByRole("button", { name: "Bulk edit" }).click();
  const dialog = screen.getByRole("dialog", { name: "Bulk edit" });
  return {
    queryClient,
    screen,
    dialog,
    importButton: dialog.getByRole("button", { name: "Import" }),
  };
}

describe("BulkEditDialog", () => {
  it("should post the edited file, close and refresh the list", async () => {
    const posted: unknown[] = [];
    worker.use(
      http.post("*/admin/samples/bulk-edit", async ({ request }) => {
        const file = (await request.formData()).get("file") as File;
        posted.push({ name: file.name, type: file.type });
        return HttpResponse.json({ count: 2 });
      }),
    );
    const { queryClient, screen, dialog, importButton } = await openDialog();
    await dialog
      .getByLabelText("choose one")
      .upload([
        new File([new Uint8Array(4)], "edited.xlsx", { type: XLSX_MEDIA_TYPE }),
      ]);

    await importButton.click();

    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent(
        "2 samples imported. Publication is running in the background.",
      );
    expect(screen.getByRole("dialog").elements()).toHaveLength(0);
    expect(posted).toEqual([{ name: "edited.xlsx", type: XLSX_MEDIA_TYPE }]);
    expect(queryClient.getQueryState(SAMPLE_LIST_KEY)?.isInvalidated).toBe(
      true,
    );
  });

  it("should list the refused rows in the open dialog", async () => {
    worker.use(
      http.post("*/admin/samples/bulk-edit", () =>
        HttpResponse.json(
          {
            error: "Invalid import",
            issues: [
              {
                sheet: "Samples",
                row: 3,
                column: "Sample #",
                value: "sample-999",
                code: "unknown_sample",
              },
              {
                sheet: "Samples",
                row: 4,
                column: "IGSN",
                value: "10.1234/CHANGED",
                code: "frozen_field",
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );
    const { dialog, importButton } = await openDialog();
    await dialog
      .getByLabelText("choose one")
      .upload([
        new File([new Uint8Array(4)], "edited.xlsx", { type: XLSX_MEDIA_TYPE }),
      ]);

    await importButton.click();

    const rows = dialog
      .getByRole("table", { name: "Samples" })
      .getByRole("row");
    await expect
      .element(rows.nth(1))
      .toHaveTextContent("3Sample #sample-999No sample has this Sample #.");
    await expect
      .element(rows.nth(2))
      .toHaveTextContent(
        "4IGSN10.1234/CHANGEDThis cell cannot change once the sample is published.",
      );
  });

  it("should reject a non-xlsx file inline and keep Import disabled", async () => {
    const { dialog, importButton } = await openDialog();

    await dialog
      .getByLabelText("choose one")
      .upload([new File(["a,b\n"], "samples.csv", { type: "text/csv" })]);

    await expect
      .element(dialog.getByRole("alert"))
      .toHaveTextContent("This file is not an Excel .xlsx file.");
    await expect.element(importButton).toBeDisabled();
  });
});
