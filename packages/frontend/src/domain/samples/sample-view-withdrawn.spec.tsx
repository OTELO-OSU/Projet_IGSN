import type { WithdrawnSample } from "@projet-igsn/domain/sample/publication/withdrawn-sample";

import { useEffect, useState } from "react";

import { publishedSample } from "../../../test/published-sample.ts";
import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { stubAuth } from "../../../test/stub-auth.tsx";
import { SampleView } from "./sample-view.tsx";

const sample = (overrides: Partial<WithdrawnSample> = {}): WithdrawnSample => ({
  status: "withdrawn",
  igsn: "0123456789ABCDEFGHJKMNPQRS",
  name: "Rhyolite 11",
  nature: "powder",
  type: "core.half_round",
  material: "rock_and_sediment.rock.igneous",
  specificName: "Pitchstone",
  location: {
    region: { kind: "country", country: "FR" },
    localityName: "Mont-Dore",
  },
  collectorFirstname: "Claire",
  collectorLastname: "Martin",
  ...overrides,
});

const lineage = {
  nodes: [
    {
      id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      igsn: "0123456789ABCDEFGHJKMNPQRT",
      name: "Rhyolite 10",
      generation: -1,
      tombstone: false,
    },
    {
      id: "3f2504e0-4f89-41d3-9a0c-0305e82c3300",
      igsn: "0123456789ABCDEFGHJKMNPQRS",
      name: "Rhyolite 11",
      generation: 0,
      tombstone: false,
    },
  ],
  edges: [
    {
      parentId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      childId: "3f2504e0-4f89-41d3-9a0c-0305e82c3300",
    },
  ],
};

function WithdrawnOnEvent() {
  const [withdrawn, setWithdrawn] = useState(false);
  useEffect(() => {
    const swap = () => setWithdrawn(true);
    window.addEventListener("swap-sample", swap);
    return () => window.removeEventListener("swap-sample", swap);
  }, []);
  return (
    <SampleView
      sample={withdrawn ? sample() : publishedSample()}
      lineage={lineage}
    />
  );
}

describe("SampleView of a withdrawn sample", () => {
  it("should keep the open lineage graph when the sample turns withdrawn", async () => {
    const screen = await renderWithRouter(stubAuth(<WithdrawnOnEvent />), [
      "/samples/$igsn",
    ]);
    await screen.getByRole("button", { name: "Expand the lineage" }).click();

    window.dispatchEvent(new Event("swap-sample"));

    await expect
      .element(screen.getByText(/This sample is private/))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("dialog", { name: "Sample lineage" }))
      .toBeInTheDocument();
  });

  it("should show the lineage of the withdrawn sample", async () => {
    const screen = await renderWithRouter(
      <SampleView sample={sample()} lineage={lineage} />,
      ["/samples/$igsn"],
    );

    await expect
      .element(screen.getByRole("heading", { level: 2, name: "Lineage" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("link", { name: "Rhyolite 10 Parent sample" }))
      .toBeInTheDocument();
  });

  it("should show only the whitelisted fields", async () => {
    const screen = await renderWithRouter(<SampleView sample={sample()} />);

    await expect.element(screen.getByText("Powder")).toBeVisible();
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
    await expect.element(screen.getByText("Pitchstone")).toBeVisible();
    await expect.element(screen.getByText("France > Mont-Dore")).toBeVisible();
    await expect.element(screen.getByText("Claire Martin")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Process steps" }).query(),
    ).toBeNull();
  });

  it("should show the QR code of a withdrawn sample, which still resolves publicly", async () => {
    const screen = await renderWithRouter(<SampleView sample={sample()} />);

    await expect
      .element(screen.getByRole("img", { name: /QR code/ }))
      .toBeInTheDocument();
  });

  it("should offer the private notice and a way to contact the owner", async () => {
    const screen = await renderWithRouter(<SampleView sample={sample()} />);

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

  it("should show a person without a firstname as the lastname alone", async () => {
    const screen = await renderWithRouter(
      <SampleView sample={sample({ collectorFirstname: null })} />,
    );

    await expect
      .element(screen.getByText("Martin", { exact: true }))
      .toBeVisible();
  });
});
