import { render } from "vitest-browser-react";

import App from "./app";

describe("App", () => {
  it("should render the app", async () => {
    const screen = await render(<App />);
    await expect
      .element(screen.getByRole("heading", { name: "IGSN", level: 1 }))
      .toBeInTheDocument();
  });
});
