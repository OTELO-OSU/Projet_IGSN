import { expect, type Page } from "@playwright/test";

import { adminUrl } from "../urls";
import { chooseOption } from "./choose-option.ts";
import { managedGroupsSection } from "./managed-groups.page.ts";

export function serviceAccountsPage(page: Page) {
  const menuEntry = page
    .getByRole("navigation")
    .getByRole("link", { name: "Service accounts" });
  const row = (name: string) =>
    page
      .getByRole("row")
      .filter({ has: page.getByRole("link", { name, exact: true }) });

  return {
    goto: () => page.goto(`${adminUrl}/service-accounts`),
    open: () => menuEntry.click(),
    expectNoMenuEntry: () => expect(menuEntry).toBeHidden(),
    expectVisible: () =>
      expect(
        page.getByRole("heading", { name: "Service accounts", level: 1 }),
      ).toBeVisible(),
    goToCreate: () =>
      page.getByRole("link", { name: "New service account" }).click(),
    openAccount: (name: string) =>
      page.getByRole("link", { name, exact: true }).click(),
    expectAccountRow: (name: string) => expect(row(name)).toBeVisible(),
    expectNoAccountRow: (name: string) => expect(row(name)).toHaveCount(0),
  };
}

export function serviceAccountPage(page: Page) {
  const choose = chooseOption(page);

  return {
    expectVisible: (name: string) =>
      expect(page.getByRole("heading", { name, level: 1 })).toBeVisible(),
    fillName: (name: string) =>
      page.getByRole("textbox", { name: "Service name" }).fill(name),
    chooseInstitution: async (institution: {
      organization: string;
      laboratory: string;
    }) => {
      await choose(/^Organization/, institution.organization);
      await choose(/^Laboratory/, institution.laboratory);
    },
    grant: managedGroupsSection(page).grant,
    chooseOwner: async (search: string, name: string) => {
      await page.getByRole("combobox", { name: /^Requested by/ }).click();
      await page.getByPlaceholder("Search by name or email").fill(search);
      await page.getByRole("option").filter({ hasText: name }).click();
    },
    expectPrefilled: async (prefill: {
      name: string;
      laboratory: string;
      owner: string;
    }) => {
      await expect(
        page.getByRole("textbox", { name: "Service name" }),
      ).toHaveValue(prefill.name);
      await expect(
        page.getByRole("combobox", { name: /^Laboratory/ }),
      ).toContainText(prefill.laboratory);
      await expect(
        page.getByRole("combobox", { name: /^Requested by/ }),
      ).toContainText(prefill.owner);
    },
    create: () =>
      page.getByRole("button", { name: "Create", exact: true }).click(),
    save: async () => {
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByText("Service account updated")).toBeVisible();
    },
    remove: async () => {
      await page
        .getByRole("button", { name: "Delete this service account" })
        .click();
      await page.getByLabel("Type DELETE to confirm").fill("DELETE");
      await page.getByRole("button", { name: "Delete", exact: true }).click();
    },
  };
}
