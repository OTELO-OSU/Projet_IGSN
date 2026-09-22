import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { vi } from "vitest";
import { page } from "vitest/browser";

import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

async function renderLocationSection(
  location: CreateSample["location"],
  onSubmit: (value: CreateSample) => void = noop,
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
        location,
      }}
      primaryAction={{ kind: "submit", label: "Create", onSubmit }}
    />,
  );
  await screen.getByRole("tab", { name: "Location" }).click();
  return screen;
}

beforeAll(() => page.viewport(1280, 1600));

describe("LocationRegionFields", () => {
  it("should hydrate a stored ocean region into its chips", async () => {
    const screen = await renderLocationSection({
      region: { kind: "ocean", oceanSea: "atlantic_ocean" },
    });

    await expect
      .element(screen.getByRole("button", { name: "Ocean / sea", exact: true }))
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("button", { name: "Atlantic Ocean", exact: true }),
      )
      .toBeVisible();
  });

  it("should submit the country picked from a search across levels", async () => {
    const onSubmit = vi.fn();
    const screen = await renderLocationSection(null, onSubmit);

    await screen.getByRole("combobox", { name: "Region", exact: true }).click();
    await screen.getByPlaceholder("Search region...").fill("France");
    await screen
      .getByRole("option", {
        name: "Country > France",
        exact: true,
      })
      .click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          location: expect.objectContaining({
            region: { kind: "country", country: "FR" },
          }),
        }),
      ),
    );
  });
});
