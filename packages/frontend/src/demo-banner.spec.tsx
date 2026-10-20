import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { DemoBanner } from "./demo-banner.tsx";

describe("DemoBanner", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should show the demo notice when the demo flag is on", async () => {
    vi.stubEnv("VITE_DEMO_BANNER", "true");
    const screen = await render(<DemoBanner />);

    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent(
        "You are browsing the IGSN demo site. Its content may be reset at any time, and its samples and IGSNs are not real.",
      );
  });

  it.each([undefined, "false"])(
    "should render nothing when the demo flag is %s",
    async (flag) => {
      vi.stubEnv("VITE_DEMO_BANNER", flag);
      const screen = await render(<DemoBanner />);

      expect(screen.container).toBeEmptyDOMElement();
    },
  );
});
