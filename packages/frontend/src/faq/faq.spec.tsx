import { vi } from "vitest";
import { page } from "vitest/browser";

import { renderWithRouter } from "../../test/render-with-router.tsx";
import { faqCategories } from "./faq-categories.ts";
import { Faq } from "./faq.tsx";

const ACCOUNT = faqCategories().find(({ slug }) => slug === "account");
const DATASET_URL =
  "https://www.data.gouv.fr/datasets/6accaa852f4ae7724956d181";

describe("faqCategories", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should leave the open data entry out without a dataset URL", () => {
    vi.stubEnv("VITE_DATA_GOUV_DATASET_URL", undefined);

    const usage = faqCategories().find(({ slug }) => slug === "usage");

    expect(
      usage?.questions.find(({ value }) => value === "open-data"),
    ).toBeUndefined();
  });
});

describe("Faq", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should link the open data entry to the dataset", async () => {
    vi.stubEnv("VITE_DATA_GOUV_DATASET_URL", DATASET_URL);
    await renderWithRouter(
      <Faq query="download all published" onQueryChange={() => {}} />,
    );

    await expect
      .element(
        page.getByRole("link", {
          name: "Download published samples from data.gouv.fr (opens in a new tab)",
        }),
      )
      .toHaveAttribute("href", DATASET_URL);
  });

  it("should link a tile to each category page for a blank query", async () => {
    await renderWithRouter(<Faq query="" onQueryChange={() => {}} />, [
      "/faq/$category",
    ]);
    const tiles = page.getByRole("navigation", { name: "FAQ categories" });
    await expect.element(tiles).toBeVisible();

    expect(
      tiles
        .getByRole("link")
        .elements()
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["General", "/faq/general"],
      ["Account and access", "/faq/account"],
      ["Registering samples", "/faq/registration"],
      ["Relations between samples", "/faq/relations"],
      ["Visibility, editing and deletion", "/faq/visibility"],
      ["Using an IGSN", "/faq/usage"],
      ["Service accounts", "/faq/service-accounts"],
    ]);
  });

  it("should show the matches of the query expanded under their category", async () => {
    await renderWithRouter(<Faq query="orcid" onQueryChange={() => {}} />);

    await expect
      .element(
        page.getByRole("heading", { level: 2, name: "Account and access" }),
      )
      .toBeVisible();
    await expect
      .element(
        page.getByRole("button", {
          name: "How do I link my ORCID to my IGSN account?",
        }),
      )
      .toHaveAttribute("aria-expanded", "true");
    await expect
      .element(page.getByRole("navigation", { name: "FAQ categories" }))
      .not.toBeInTheDocument();
  });

  it("should report a keystroke without searching until the query changes", async () => {
    const onQueryChange = vi.fn();
    await renderWithRouter(<Faq query="orcid" onQueryChange={onQueryChange} />);

    await page.getByRole("searchbox", { name: "Search the FAQ" }).fill("zzzz");

    expect(onQueryChange).toHaveBeenLastCalledWith("zzzz");
    await expect
      .element(page.getByRole("searchbox", { name: "Search the FAQ" }))
      .toHaveValue("orcid");
  });

  it.each([
    { rule: "no question matches", category: undefined, query: "zzzz" },
    {
      rule: "only another category's question matches",
      category: ACCOUNT,
      query: "sesar",
    },
  ])("should say so when $rule", async ({ category, query }) => {
    await renderWithRouter(
      <Faq category={category} query={query} onQueryChange={() => {}} />,
    );

    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("No question matches your search.");
  });

  it("should link a category page back to all questions", async () => {
    await renderWithRouter(
      <Faq category={ACCOUNT} query="" onQueryChange={() => {}} />,
      ["/faq"],
    );

    await expect
      .element(page.getByRole("link", { name: "Back to all questions" }))
      .toHaveAttribute("href", "/faq");
  });

  it("should show a category's questions collapsed for a blank query", async () => {
    await renderWithRouter(
      <Faq category={ACCOUNT} query="" onQueryChange={() => {}} />,
    );

    await expect
      .element(page.getByRole("button", { name: "How do I sign in?" }))
      .toHaveAttribute("aria-expanded", "false");
    await expect
      .element(page.getByRole("navigation", { name: "FAQ categories" }))
      .not.toBeInTheDocument();
  });
});
