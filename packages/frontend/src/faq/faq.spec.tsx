import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { Faq } from "./faq.tsx";

describe("Faq", () => {
  it("should open the question matching the search and show only its matching answers", async () => {
    await render(<Faq />);

    await page.getByRole("searchbox", { name: "Search the FAQ" }).fill("typo");

    await expect
      .element(
        page.getByRole("button", { name: "How does the search find samples?" }),
      )
      .toHaveAttribute("aria-expanded", "true");
    await expect
      .element(page.getByText(/Small typos are forgiven/))
      .toBeVisible();
    await expect
      .element(page.getByText(/Only published samples/))
      .not.toBeInTheDocument();
    await expect
      .element(
        page.getByRole("button", { name: "How do I search for a sample?" }),
      )
      .not.toBeInTheDocument();
  });

  it("should say so when no question matches the search", async () => {
    await render(<Faq />);

    await page.getByRole("searchbox", { name: "Search the FAQ" }).fill("zzzz");

    await expect
      .element(page.getByText("No question matches your search."))
      .toBeVisible();
  });
});
