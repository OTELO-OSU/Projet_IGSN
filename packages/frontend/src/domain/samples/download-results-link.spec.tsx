import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";

import { baseBrowserApiUrl } from "#/api.ts";
import { SEARCH_EXPORT_LIMIT } from "#/search-export-limit.ts";

import { DownloadResultsLink } from "./download-results-link.tsx";

const name = /download results/i;

describe("DownloadResultsLink", () => {
  beforeEach(async () => {
    await page.viewport(1280, 800);
  });

  it("should link to the export of the search filters, without pagination, up to the cap", async () => {
    const screen = await render(
      <DownloadResultsLink
        filters={{ search: "basalt", filters: { material: "rock" } }}
        total={SEARCH_EXPORT_LIMIT}
      />,
    );

    await expect
      .element(screen.getByRole("link", { name }))
      .toHaveAttribute(
        "href",
        new URL("samples/export?search=basalt&material=rock", baseBrowserApiUrl)
          .href,
      );
  });

  it("should disable the download and explain why above the cap", async () => {
    const screen = await render(
      <DownloadResultsLink
        filters={{ search: "basalt" }}
        total={SEARCH_EXPORT_LIMIT + 1}
      />,
    );

    await expect.element(screen.getByRole("button", { name })).toBeDisabled();
    await userEvent.tab();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(
        `More than ${SEARCH_EXPORT_LIMIT} results: refine your search or use the open data.`,
      );
  });
});
