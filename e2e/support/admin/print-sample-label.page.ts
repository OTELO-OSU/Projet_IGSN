import { expect, type Page } from "@playwright/test";

const CSS_PX_PER_CM = 96 / 2.54;

export function printSampleLabelPage(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Print a label" });
  const printedQrCode = (igsn: string) =>
    page
      .getByRole("img", {
        name: `QR code linking to sample ${igsn}`,
        includeHidden: true,
      })
      .filter({ visible: true });
  return {
    open: () => page.getByRole("button", { name: "Print label" }).click(),
    pickSize: (option: string) =>
      dialog.getByRole("radio", { name: option, exact: true }).click(),
    emulatePrint: () => page.emulateMedia({ media: "print" }),
    close: async () => {
      await page.emulateMedia({ media: null });
      await dialog.getByRole("button", { name: "Close" }).click();
      await expect(dialog).toBeHidden();
    },
    expectOnlyLabelPrinted: async (igsn: string, sizeCm: number) => {
      await expect(printedQrCode(igsn)).toBeVisible();
      await expect(page.getByRole("main")).toBeHidden();
      await expect(dialog).toBeHidden();
      const box = await printedQrCode(igsn).boundingBox();
      expect(box?.width).toBeCloseTo(sizeCm * CSS_PX_PER_CM, 0);
      expect(box?.height).toBeCloseTo(sizeCm * CSS_PX_PER_CM, 0);
    },
  };
}
