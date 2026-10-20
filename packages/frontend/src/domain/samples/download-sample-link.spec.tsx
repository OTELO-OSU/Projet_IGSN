import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { baseBrowserApiUrl } from "#/api.ts";

import { DownloadSampleLink } from "./download-sample-link.tsx";

const IGSN = "0123456789ABCDEFGHJKMNPQRS";

describe("DownloadSampleLink", () => {
  it.each([
    { item: "CSV", format: "csv" },
    { item: "Excel", format: "xlsx" },
  ])("should download the sample's $item export", async ({ item, format }) => {
    await render(<DownloadSampleLink igsn={IGSN} />);
    await page.getByRole("button", { name: "Download" }).click();

    const link = page.getByRole("menuitem", { name: item });
    await expect
      .element(link)
      .toHaveAttribute(
        "href",
        new URL(`samples/${IGSN}/export?format=${format}`, baseBrowserApiUrl)
          .href,
      );
    await expect.element(link).toHaveAttribute("download");
  });
});
