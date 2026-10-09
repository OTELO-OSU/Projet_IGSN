import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { OpenDataLink } from "./open-data-link.tsx";

const datasetUrl = "https://www.data.gouv.fr/datasets/igsn-samples";
const name = /data\.gouv\.fr/;

describe("OpenDataLink", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should link to the configured data.gouv.fr dataset", async () => {
    vi.stubEnv("VITE_DATA_GOUV_DATASET_URL", datasetUrl);
    const screen = await render(<OpenDataLink />);

    await expect
      .element(screen.getByRole("link", { name }))
      .toHaveAttribute("href", datasetUrl);
  });

  it("should render nothing when no dataset is configured", async () => {
    vi.stubEnv("VITE_DATA_GOUV_DATASET_URL", undefined);
    const screen = await render(<OpenDataLink />);

    expect(screen.container).toBeEmptyDOMElement();
  });
});
