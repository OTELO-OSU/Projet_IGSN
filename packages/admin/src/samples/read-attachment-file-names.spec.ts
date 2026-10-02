import { XLSX_MEDIA_TYPE } from "@projet-igsn/domain/sample/import/import-validator";

import { buildAttachmentWorkbook } from "../../test/build-attachment-workbook.ts";
import { readAttachmentFileNames } from "./read-attachment-file-names.ts";

describe("readAttachmentFileNames", () => {
  it("should return the unique file names of the Attachments sheet in order, skipping empty cells", async () => {
    const file = await buildAttachmentWorkbook([
      "report.pdf",
      "photo.jpg",
      null,
      "report.pdf",
      "  ",
    ]);

    expect(await readAttachmentFileNames(file)).toEqual([
      "report.pdf",
      "photo.jpg",
    ]);
  });

  it.each([
    {
      reason: "a workbook without the Attachments sheet",
      file: () => buildAttachmentWorkbook(null),
    },
    {
      reason: "an unreadable file",
      file: async () =>
        new File([new Uint8Array(4)], "samples.xlsx", {
          type: XLSX_MEDIA_TYPE,
        }),
    },
  ])("should return no name for $reason", async ({ file }) => {
    expect(await readAttachmentFileNames(await file())).toEqual([]);
  });
});
