import { page, userEvent } from "vitest/browser";

import { baseBrowserApiUrl } from "#/api.ts";
import {
  SEARCH_CSV_EXPORT_LIMIT,
  SEARCH_XLSX_EXPORT_LIMIT,
} from "#/search-export-limit.ts";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { DownloadResultsLink } from "./download-results-link.tsx";

const name = /download results/i;

const igsns = (count: number) =>
  Array.from({ length: count }, (_, index) => `IGSN${index}`);

const xlsxTooMany = `Excel holds at most ${SEARCH_XLSX_EXPORT_LIMIT} samples: export fewer or choose CSV.`;

describe("DownloadResultsLink", () => {
  beforeEach(async () => {
    await page.viewport(1280, 800);
  });

  it.each([
    ["CSV", "csv"],
    ["Excel", "xlsx"],
  ])(
    "should link %s to the export of the search filters, without pagination",
    async (item, format) => {
      await renderWithRouter(
        <DownloadResultsLink
          filters={{ search: "basalt", filters: { material: "rock" } }}
          total={SEARCH_XLSX_EXPORT_LIMIT}
          selected={[]}
        />,
      );

      await page.getByRole("button", { name }).click();

      await expect
        .element(page.getByRole("menuitem", { name: item }))
        .toHaveAttribute(
          "href",
          new URL(
            `samples/export?search=basalt&material=rock&format=${format}`,
            baseBrowserApiUrl,
          ).href,
        );
    },
  );

  it("should post exactly the checked samples as Excel, whatever the filtered total", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(new Blob(["xlsx"])));
    await renderWithRouter(
      <DownloadResultsLink
        filters={{ search: "basalt" }}
        total={SEARCH_CSV_EXPORT_LIMIT + 1}
        selected={["IGSN1", "IGSN2"]}
      />,
    );

    await page.getByRole("button", { name: "Download 2 selected" }).click();
    await page.getByRole("menuitem", { name: "Excel" }).click();

    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect({
      url: (url as URL).href,
      method: init?.method,
      body: JSON.parse(init?.body as string),
    }).toEqual({
      url: new URL("samples/export", baseBrowserApiUrl).href,
      method: "POST",
      body: { format: "xlsx", igsns: ["IGSN1", "IGSN2"] },
    });
  });

  it("should disable the download and explain why above the cap with nothing checked", async () => {
    await renderWithRouter(
      <DownloadResultsLink
        filters={{ search: "basalt" }}
        total={SEARCH_CSV_EXPORT_LIMIT + 1}
        selected={[]}
      />,
    );

    await expect.element(page.getByRole("button", { name })).toBeDisabled();
    await userEvent.tab();
    await expect
      .element(page.getByRole("tooltip"))
      .toHaveTextContent(
        `More than ${SEARCH_CSV_EXPORT_LIMIT} results: refine your search or use the open data.`,
      );
  });

  it.each([
    ["the filtered total", SEARCH_XLSX_EXPORT_LIMIT + 1, []],
    ["the checked samples", 1, igsns(SEARCH_XLSX_EXPORT_LIMIT + 1)],
  ])(
    "should keep CSV and disable Excel with its cap when %s exceed the Excel cap",
    async (_case, total, selected) => {
      await renderWithRouter(
        <DownloadResultsLink
          filters={{ search: "basalt" }}
          total={total}
          selected={selected}
        />,
      );

      await page.getByRole("button", { name: /download/i }).click();
      const excel = page.getByRole("menuitem", { name: "Excel" });
      await excel.hover();

      await expect.element(excel).toHaveAttribute("aria-disabled", "true");
      await expect
        .element(page.getByRole("menuitem", { name: "CSV" }))
        .not.toHaveAttribute("aria-disabled");
      await expect
        .element(page.getByRole("tooltip"))
        .toHaveTextContent(xlsxTooMany);
    },
  );
});
