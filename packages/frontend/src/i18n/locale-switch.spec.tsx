import { render } from "vitest-browser-react";

import { LocaleSwitch } from "./locale-switch.tsx";

describe("LocaleSwitch", () => {
  it("should mark the current locale and offer the other one as a button named in its own language", async () => {
    const screen = await render(<LocaleSwitch />);

    await expect
      .element(screen.getByText("EN"))
      .toHaveAttribute("aria-current", "true");
    await expect
      .element(screen.getByRole("button", { name: "Français" }))
      .toHaveTextContent("FR");
  });
});
