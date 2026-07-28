import { render } from "vitest-browser-react";

import { SearchHelp } from "./search-help.tsx";

const TRIGGER = /how search works/i;

describe("SearchHelp", () => {
  it("should expose the trigger as a named control", async () => {
    const screen = await render(<SearchHelp />);

    await expect
      .element(screen.getByRole("button", { name: TRIGGER }))
      .toBeVisible();
  });

  it("should reveal the help on activation", async () => {
    // A tap dispatches a click, so this is the touch path too.
    const screen = await render(<SearchHelp />);

    await screen.getByRole("button", { name: TRIGGER }).click();

    await expect
      .element(screen.getByRole("dialog"))
      .toHaveTextContent(/every word/i);
  });

  it("should name the panel it opens", async () => {
    // Radix gives it role="dialog"; unnamed it announces as just "dialog".
    const screen = await render(<SearchHelp />);

    await screen.getByRole("button", { name: TRIGGER }).click();

    await expect
      .element(screen.getByRole("dialog", { name: TRIGGER }))
      .toBeVisible();
  });

  it("should be reachable by keyboard", async () => {
    // A native enabled <button> is activated by Enter/Space by the browser, so
    // the click path above is the keyboard path too.
    const screen = await render(<SearchHelp />);

    const trigger = screen.getByRole("button", { name: TRIGGER }).element();
    trigger.focus();

    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).not.toBeDisabled();
    expect(document.activeElement).toBe(trigger);
  });

  it("should explain the wildcard", async () => {
    const screen = await render(<SearchHelp />);

    await screen.getByRole("button", { name: TRIGGER }).click();

    await expect
      .element(screen.getByRole("dialog"))
      .toHaveTextContent(/\* replaces any part of a word/i);
  });

  it("should mention typo tolerance", async () => {
    const screen = await render(<SearchHelp />);

    await screen.getByRole("button", { name: TRIGGER }).click();

    await expect
      .element(screen.getByRole("dialog"))
      .toHaveTextContent(/typos are tolerated/i);
  });
});
