import { page } from "vitest/browser";

import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

const REVEAL = "Describe the locality in detail";

async function renderLocationSection(
  localityDescription: string | null = null,
) {
  const screen = await render(
    <SampleForm
      onCancel={noop}
      defaultValues={{
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "dredge",
        material: "rock_and_sediment.mineral",
        location: { localityDescription },
      }}
      primaryAction={{ kind: "submit", label: "Create", onSubmit: noop }}
    />,
  );
  await screen.getByRole("tab", { name: "Location" }).click();
  return screen;
}

beforeAll(() => page.viewport(1280, 1600));

describe("LocationFields", () => {
  it("should offer the locality description link only once a locality name is set, revealing the textarea on click", async () => {
    const screen = await renderLocationSection();

    await expect
      .element(screen.getByRole("button", { name: REVEAL }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByLabelText("Locality description"))
      .not.toBeInTheDocument();

    await screen.getByLabelText("Locality name").fill("Puy de Dôme");
    await screen.getByRole("button", { name: REVEAL }).click();

    await expect
      .element(screen.getByLabelText("Locality description"))
      .toHaveFocus();
  });

  it("should show a saved locality description expanded", async () => {
    const screen = await renderLocationSection("Northern face of the quarry");

    await expect
      .element(screen.getByLabelText("Locality description"))
      .toHaveValue("Northern face of the quarry");
  });
});
