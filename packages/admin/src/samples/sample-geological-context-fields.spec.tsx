import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { vi } from "vitest";
import { page } from "vitest/browser";

import { pickPath } from "../../test/pick-hierarchy.ts";
import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

async function renderGeologicalContextSection(
  onSubmit: (value: CreateSample) => void = noop,
) {
  const screen = await render(
    <SampleForm
      onCancel={noop}
      defaultValues={{
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "dredge",
        material: "mineral",
        collectionMethod: null,
        collectionMethodDescription: null,
      }}
      primaryAction={{ kind: "submit", label: "Create", onSubmit }}
    />,
  );
  await screen.getByRole("tab", { name: "Location" }).click();
  return screen;
}

beforeAll(() => page.viewport(1280, 1600));

describe("SampleGeologicalContextFields", () => {
  it("should submit the description with an environment left at its zone", async () => {
    const onSubmit = vi.fn();
    const screen = await renderGeologicalContextSection(onSubmit);

    await expect
      .element(
        screen.getByRole("heading", {
          name: "Geomorphological context",
          level: 2,
        }),
      )
      .toBeVisible();
    await screen
      .getByLabelText("Geological context description")
      .fill("Basaltic plateau carved by the river");
    await pickPath(screen, "Environment", "Marine zone", "Stop here");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          geologicalContextDescription: "Basaltic plateau carved by the river",
          geomorphologicalEnvironment: "marine_zone",
        }),
      ),
    );
  });
});
