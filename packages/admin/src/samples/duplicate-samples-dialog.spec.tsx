import type { SuspectedDuplicate } from "@projet-igsn/domain/sample/publication/suspected-duplicate";

import { vi } from "vitest";

import { render } from "../../test/render.tsx";
import { DuplicateSamplesDialog } from "./duplicate-samples-dialog.tsx";

const DUPLICATES: SuspectedDuplicate[] = [
  {
    id: "3f2504e0-4f89-41d3-9a0c-0305000000b1",
    igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
    name: "Basalte du Massif Central",
  },
  {
    id: "3f2504e0-4f89-41d3-9a0c-0305000000b2",
    igsn: "01K072TVWVFK5A1RRZ5MY4PPKA",
    name: "Basalte du Puy de Dome",
  },
];

const renderDialog = (onConfirm: () => void = () => {}) =>
  render(
    <DuplicateSamplesDialog
      duplicates={DUPLICATES}
      onConfirm={onConfirm}
      onCancel={() => {}}
    />,
  );

describe("DuplicateSamplesDialog", () => {
  it.each(DUPLICATES)(
    "should link the suspected sample $name to its public page",
    async ({ igsn, name }) => {
      const screen = await renderDialog();

      await expect
        .element(screen.getByRole("link", { name: `${name} (${igsn})` }))
        .toHaveAttribute("href", `http://localhost:3000/samples/${igsn}`);
    },
  );

  it("should not continue when the user cancels", async () => {
    const onConfirm = vi.fn();
    const screen = await renderDialog(onConfirm);

    await screen.getByRole("button", { name: "Cancel" }).click();

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("should continue when the user confirms", async () => {
    const onConfirm = vi.fn();
    const screen = await renderDialog(onConfirm);

    await screen.getByRole("button", { name: "Continue anyway" }).click();

    expect(onConfirm).toHaveBeenCalled();
  });
});
