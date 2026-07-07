import { expect, type Page } from "@playwright/test";

import { frontendUrl } from "../urls";

export function sampleListPage(page: Page) {
  return {
    goto: () => page.goto(frontendUrl),
    // Each sample is a link to its detail page, addressed by IGSN; assert both
    // the name and that it points at the right sample so a wrong href can't pass
    // unnoticed.
    expectSampleLink: (name: string, igsn: string) =>
      expect(page.getByRole("link", { name })).toHaveAttribute(
        "href",
        `/en/samples/${igsn}`,
      ),
  };
}
