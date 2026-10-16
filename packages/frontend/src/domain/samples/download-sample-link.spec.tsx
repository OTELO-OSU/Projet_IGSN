import { render } from "vitest-browser-react";

import { baseBrowserApiUrl } from "#/api.ts";

import { DownloadSampleLink } from "./download-sample-link.tsx";

describe("DownloadSampleLink", () => {
  it("should download the export of the sample", async () => {
    const screen = await render(
      <DownloadSampleLink igsn="0123456789ABCDEFGHJKMNPQRS" />,
    );

    const link = screen.getByRole("link", { name: "Download as Excel" });
    await expect
      .element(link)
      .toHaveAttribute(
        "href",
        new URL("samples/0123456789ABCDEFGHJKMNPQRS/export", baseBrowserApiUrl)
          .href,
      );
    await expect.element(link).toHaveAttribute("download");
  });
});
