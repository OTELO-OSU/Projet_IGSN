import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { vi } from "vitest";
import { page } from "vitest/browser";

import { pickPath } from "../../test/pick-hierarchy.ts";
import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

const REVEAL = "Describe the geological context in detail";

async function renderGeologicalContextSection(
  onSubmit: (value: CreateSample) => void = noop,
  geologicalContextDescription: string | null = null,
) {
  const screen = await render(
    <SampleForm
      onCancel={noop}
      defaultValues={{
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "dredge",
        material: "rock_and_sediment.mineral",
        collectionMethod: null,
        collectionMethodDescription: null,
        geologicalContextDescription,
      }}
      primaryAction={{ kind: "submit", label: "Create", onSubmit }}
    />,
  );
  await screen.getByRole("tab", { name: "Location" }).click();
  return screen;
}

beforeAll(() => page.viewport(1280, 1600));

describe("SampleGeologicalContextFields", () => {
  it("should offer the physiographic environment before the description", async () => {
    const screen = await renderGeologicalContextSection();
    await pickPath(screen, "Physiographic environment", "Marine", "Seamount");
    await screen.getByRole("button", { name: REVEAL }).click();

    const environment = screen
      .getByRole("combobox", { name: "Physiographic environment" })
      .element();
    const description = screen
      .getByLabelText("Geological context description")
      .element();

    expect(
      environment.compareDocumentPosition(description) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("should submit the description with the picked physiographic environment", async () => {
    const onSubmit = vi.fn();
    const screen = await renderGeologicalContextSection(onSubmit);

    await expect
      .element(
        screen.getByRole("heading", {
          name: "Geological context",
          level: 2,
        }),
      )
      .toBeVisible();
    await pickPath(screen, "Physiographic environment", "Marine", "Seamount");
    await screen.getByRole("button", { name: REVEAL }).click();
    await screen
      .getByLabelText("Geological context description")
      .fill("Basaltic plateau carved by the river");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          geologicalContextDescription: "Basaltic plateau carved by the river",
          physiographicEnvironment: "marine.seamount",
        }),
      ),
    );
  });

  it("should offer the description link only once a physiographic environment is set, revealing the textarea on click", async () => {
    const screen = await renderGeologicalContextSection();

    await expect
      .element(screen.getByRole("button", { name: REVEAL }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByLabelText("Geological context description"))
      .not.toBeInTheDocument();

    await pickPath(screen, "Physiographic environment", "Marine", "Seamount");
    await screen.getByRole("button", { name: REVEAL }).click();

    await expect
      .element(screen.getByLabelText("Geological context description"))
      .toHaveFocus();
  });

  it("should show a saved description expanded", async () => {
    const screen = await renderGeologicalContextSection(
      noop,
      "Basaltic plateau carved by the river",
    );

    await expect
      .element(screen.getByLabelText("Geological context description"))
      .toHaveValue("Basaltic plateau carved by the river");
  });
});
