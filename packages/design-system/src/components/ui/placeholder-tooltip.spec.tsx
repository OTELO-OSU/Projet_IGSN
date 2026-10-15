import type { ReactNode } from "react";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";

import { Input } from "./input.tsx";
import { PlaceholderTooltipProvider } from "./placeholder-tooltip.tsx";
import { Textarea } from "./textarea.tsx";
import { TooltipProvider } from "./tooltip.tsx";

const placeholder = "Local/internal sample ID, e.g. LAB-2024-001";

const input = (filled: boolean) => (
  <Input placeholder={placeholder} defaultValue={filled ? "Basalt" : ""} />
);

const withTooltips = (children: ReactNode) => (
  <TooltipProvider>
    <PlaceholderTooltipProvider value>{children}</PlaceholderTooltipProvider>
  </TooltipProvider>
);

const tooltip = () => page.getByRole("tooltip");

describe("PlaceholderTooltip", () => {
  it.each([false, true])(
    "should show the placeholder when hovering an input (filled: %s)",
    async (filled) => {
      await render(withTooltips(input(filled)));

      await page.getByRole("textbox").hover();

      await expect.element(tooltip()).toHaveTextContent(placeholder);
    },
  );

  it("should show the placeholder on keyboard focus and hide it on Escape, keeping the value", async () => {
    await render(withTooltips(input(true)));

    await userEvent.tab();
    await expect.element(tooltip()).toHaveTextContent(placeholder);
    await userEvent.keyboard("{Escape}");

    await expect.element(tooltip()).not.toBeInTheDocument();
    await expect.element(page.getByRole("textbox")).toHaveValue("Basalt");
  });

  it.each([
    ["without the provider", <Input key="input" placeholder={placeholder} />],
    ["without a placeholder", withTooltips(<Input />)],
    ["on a textarea", withTooltips(<Textarea placeholder={placeholder} />)],
  ])("should show no tooltip %s", async (_case, element) => {
    await render(<TooltipProvider>{element}</TooltipProvider>);

    await userEvent.tab();
    await expect.element(page.getByRole("textbox")).toHaveFocus();

    await expect.element(tooltip()).not.toBeInTheDocument();
  });

  it("should show no tooltip on a disabled control", async () => {
    await render(withTooltips(<Input placeholder={placeholder} disabled />));

    await page.getByRole("textbox").hover({ force: true });

    await expect.element(tooltip()).not.toBeInTheDocument();
  });

  it("should not describe the hovered input by its placeholder", async () => {
    await render(withTooltips(input(false)));

    await page.getByRole("textbox").hover();
    await expect.element(tooltip()).toHaveTextContent(placeholder);

    await expect
      .element(page.getByRole("textbox"))
      .toHaveAccessibleDescription("");
  });
});
