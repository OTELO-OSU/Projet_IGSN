import type { WithdrawnSample } from "@projet-igsn/domain/sample/publication/withdrawn-sample";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { WithdrawnSampleView } from "./withdrawn-sample-view.tsx";

const sample = (overrides: Partial<WithdrawnSample> = {}): WithdrawnSample => ({
  status: "withdrawn",
  igsn: "0123456789ABCDEFGHJKMNPQRS",
  name: "Rhyolite 11",
  nature: "rock_powder",
  type: "core.half_round",
  material: "rock.igneous",
  location: {
    region: { kind: "continent", country: "FR" },
    localityName: "Mont-Dore",
  },
  collectorName: "Claire Martin",
  collectionCurator: "Paul Durand",
  ...overrides,
});

describe("WithdrawnSampleView", () => {
  it("should show only the whitelisted fields", async () => {
    const screen = await renderWithRouter(
      <WithdrawnSampleView sample={sample()} />,
    );

    await expect.element(screen.getByText("Rock powder")).toBeVisible();
    await expect
      .element(
        screen.getByRole("list", { name: "Type" }).getByText("Core Half round"),
      )
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("list", { name: "Material" }).getByText("Igneous"),
      )
      .toBeVisible();
    await expect.element(screen.getByText("France > Mont-Dore")).toBeVisible();
    await expect.element(screen.getByText("Claire Martin")).toBeVisible();
    await expect.element(screen.getByText("Paul Durand")).toBeVisible();
  });

  it("should offer the private notice and a way to contact the owner", async () => {
    const screen = await renderWithRouter(
      <WithdrawnSampleView sample={sample()} />,
    );

    await expect
      .element(
        screen.getByRole("heading", { level: 2, name: "Private sample" }),
      )
      .toBeVisible();
    await expect
      .element(
        screen.getByText(
          "This sample is private. For more information, please contact the owner of the sample listing.",
        ),
      )
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Contact the record owner" }))
      .toBeVisible();
  });
});
