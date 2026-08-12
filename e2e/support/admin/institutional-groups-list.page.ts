import { expect, type Page } from "@playwright/test";

import { adminUrl } from "../urls";

export function institutionalGroupsListPage(page: Page) {
  return {
    gotoOrganizations: () =>
      page.goto(`${adminUrl}/institutional-groups/organizations`),
    openLaboratories: () =>
      page.getByRole("link", { name: "Laboratories" }).click(),
    expectLaboratories: () =>
      expect(page.getByRole("heading", { name: "Laboratories" })).toBeVisible(),
    filterByOrganization: async (organization: string) => {
      await page.getByRole("combobox", { name: "Organization" }).click();
      await page.getByPlaceholder("Search organizations...").fill(organization);
      await page.getByRole("option", { name: organization }).click();
    },
    expectLaboratoryRow: (acronym: string) =>
      expect(
        page.getByRole("cell", { name: acronym, exact: true }),
      ).toBeVisible(),
    expectNoLaboratoryRow: (acronym: string) =>
      expect(
        page.getByRole("cell", { name: acronym, exact: true }),
      ).toBeHidden(),
    openLaboratory: (acronym: string) =>
      page.getByRole("link", { name: acronym, exact: true }).click(),
    expectMember: (email: string) =>
      expect(page.getByRole("cell", { name: email })).toBeVisible(),
    expectNoMenuSection: () =>
      expect(page.getByRole("link", { name: "Laboratories" })).toBeHidden(),
  };
}
