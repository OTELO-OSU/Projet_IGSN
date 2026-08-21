import { expect, type Page } from "@playwright/test";

import { pickComboboxOption } from "./pick-combobox-option.ts";

export function managedGroupsSection(page: Page) {
  const heading = page.getByRole("heading", {
    name: "Managed groups",
    level: 2,
  });

  return {
    expectVisible: () => expect(heading).toBeVisible(),
    expectAbsent: () => expect(heading).toHaveCount(0),
    grant: (field: string, query: string, option: string) =>
      pickComboboxOption(page, {
        field,
        query,
        option,
        chipLabel: `Remove ${option}`,
      }),
    expectGranted: (option: string) =>
      expect(
        page.getByRole("button", { name: `Remove ${option}` }),
      ).toBeVisible(),
  };
}
