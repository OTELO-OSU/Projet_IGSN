import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { PrintSampleLabelDialog } from "./print-sample-label-dialog.tsx";

const IGSN = "01K072TVWVFK5A1RRZ5MY4PPK9";
const NAME = "Granite 7";

async function openDialog() {
  const screen = await render(
    <PrintSampleLabelDialog igsn={IGSN} name={NAME} />,
  );
  await screen.getByRole("button", { name: "Print label" }).click();
  return screen;
}

function labelQrCodes(screen: Awaited<ReturnType<typeof openDialog>>) {
  return screen
    .getByRole("img", {
      name: `QR code linking to sample ${IGSN}`,
      includeHidden: true,
    })
    .elements();
}

describe("PrintSampleLabelDialog", () => {
  it("should preview and print a 3 cm label by default", async () => {
    const screen = await openDialog();

    await expect.element(screen.getByText(NAME).first()).toBeVisible();

    await expect
      .element(screen.getByRole("radio", { name: "3 cm", exact: true }))
      .toBeChecked();
    const qrCodes = labelQrCodes(screen);
    expect(qrCodes).toHaveLength(2);
    for (const qrCode of qrCodes) {
      expect(qrCode).toHaveStyle({ width: "3cm", height: "3cm" });
    }
  });

  it.each<[string, number]>([
    ["1.5 cm", 1.5],
    ["3 cm", 3],
    ["5 cm", 5],
    ["8 cm", 8],
  ])(
    "should preview and print the label at the picked %s",
    async (option, sizeCm) => {
      const screen = await openDialog();

      await screen.getByRole("radio", { name: option, exact: true }).click();

      await expect
        .element(screen.getByRole("radio", { name: option, exact: true }))
        .toBeChecked();
      const qrCodes = labelQrCodes(screen);
      expect(qrCodes).toHaveLength(2);
      for (const qrCode of qrCodes) {
        expect(qrCode).toHaveStyle({
          width: `${sizeCm}cm`,
          height: `${sizeCm}cm`,
        });
      }
    },
  );

  it("should open the browser print dialog from Print", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const screen = await openDialog();

    await screen.getByRole("button", { name: "Print", exact: true }).click();

    expect(print).toHaveBeenCalledOnce();
  });
});
