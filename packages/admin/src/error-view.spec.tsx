import { render } from "vitest-browser-react";

import { ErrorView } from "./error-view.tsx";

function failure() {
  const error = new Error("samples request exploded");
  error.stack = "Error: samples request exploded\n    at useSamples";
  return error;
}

describe("ErrorView", () => {
  it("should announce the failure with its localized title and message", async () => {
    const screen = await render(<ErrorView error={failure()} />);

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("Something went wrong");
    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("The page could not be displayed.");
  });

  it("should detail the error message and stack in development", async () => {
    const screen = await render(<ErrorView error={failure()} />);

    await screen.getByText("samples request exploded", { exact: true }).click();

    await expect.element(screen.getByText(/at useSamples/)).toBeInTheDocument();
  });
});
