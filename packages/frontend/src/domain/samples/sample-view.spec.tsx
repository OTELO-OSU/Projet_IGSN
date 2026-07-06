import { render } from "vitest-browser-react";

import { SampleView } from "./sample-view.tsx";

describe("SampleView", () => {
  it("should show the name as the heading and the igsn as subtitle", async () => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
      />,
    );

    await expect
      .element(screen.getByRole("heading", { level: 1, name: "Basalt 42" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("0123456789ABCDEFGHJKMNPQRS"))
      .toBeInTheDocument();
  });

  it("should show the translated nature", async () => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
      />,
    );

    await expect.element(screen.getByText("Rock powder")).toBeInTheDocument();
  });
});
