import { render } from "vitest-browser-react";

import { ErrorView } from "./error-view.tsx";

describe("ErrorView", () => {
  it("should tell the reader the page failed to load", async () => {
    const screen = await render(<ErrorView error={new Error("boom")} />);

    await expect
      .element(
        screen.getByText("Something went wrong while loading this page."),
      )
      .toBeInTheDocument();
  });

  it("should disclose the error message and stack in development", async () => {
    const error = new Error("boom");
    error.stack = "Error: boom\n    at listSamples";

    const screen = await render(<ErrorView error={error} />);

    await expect
      .element(screen.getByText("boom", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/at listSamples/))
      .toBeInTheDocument();
  });
});
