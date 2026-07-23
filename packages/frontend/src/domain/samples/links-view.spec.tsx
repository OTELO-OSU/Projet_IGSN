import { render } from "vitest-browser-react";

import { LinksView } from "./links-view.tsx";

const IGSN = "0123456789ABCDEFGHJKMNPQRS";

const link = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  url: "https://doi.org/10.1594/IEDA.100252",
  description: "Companion dataset",
};

const attachment = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3302",
  name: "measurements.csv",
  mediaType: "text/csv",
  description: "Raw XRF measurements",
};

describe("LinksView", () => {
  it("should render a DOI link opening in a new tab", async () => {
    const screen = await render(
      <LinksView igsn={IGSN} links={[link]} attachments={[]} />,
    );

    const anchor = screen.getByRole("link", {
      name: "https://doi.org/10.1594/IEDA.100252",
    });
    await expect.element(anchor).toBeVisible();
    await expect
      .element(anchor)
      .toHaveAttribute("href", "https://doi.org/10.1594/IEDA.100252");
    await expect.element(anchor).toHaveAttribute("target", "_blank");
    await expect.element(anchor).toHaveAttribute("rel", "noopener noreferrer");
    await expect.element(screen.getByText("Companion dataset")).toBeVisible();
  });

  it("should render a link without a description", async () => {
    const screen = await render(
      <LinksView
        igsn={IGSN}
        links={[{ ...link, description: null }]}
        attachments={[]}
      />,
    );

    await expect
      .element(
        screen.getByRole("link", {
          name: "https://doi.org/10.1594/IEDA.100252",
        }),
      )
      .toBeVisible();
  });

  it("should render a download button per attachment", async () => {
    const screen = await render(
      <LinksView igsn={IGSN} links={[]} attachments={[attachment]} />,
    );

    await expect.element(screen.getByText("measurements.csv")).toBeVisible();
    await expect
      .element(screen.getByText("Raw XRF measurements"))
      .toBeVisible();
    const download = screen.getByRole("link", {
      name: "Download measurements.csv",
    });
    await expect.element(download).toBeVisible();
    await expect
      .element(download)
      .toHaveAttribute(
        "href",
        expect.stringContaining(`samples/${IGSN}/attachments/${attachment.id}`),
      );
  });

  it("should hide the empty group headings", async () => {
    const screen = await render(
      <LinksView igsn={IGSN} links={[link]} attachments={[]} />,
    );

    await expect
      .element(screen.getByRole("heading", { name: "DOI links" }))
      .toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Attached files" }).query(),
    ).toBeNull();
  });
});
