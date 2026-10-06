import { expect, type Page } from "@playwright/test";

import { adminUrl } from "../urls";
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

export const chooseUser =
  (page: Page) => async (field: RegExp, search: string, name: string) => {
    await page.getByRole("combobox", { name: field }).click();
    await page.getByPlaceholder("Search by name or email").fill(search);
    await page.getByRole("option").filter({ hasText: name }).click();
  };

export function serviceAccountPage(page: Page) {
  const choose = chooseUser(page);

  return {
    expectVisible: (name: string) =>
      expect(page.getByRole("heading", { name, level: 1 })).toBeVisible(),
    fillName: (name: string) =>
      page.getByRole("textbox", { name: "Service name" }).fill(name),
    grant: managedGroupsSection(page).grant,
    chooseOwner: (search: string, name: string) =>
      choose(/^Requested by/, search, name),
    chooseSamplesOwner: (search: string, name: string) =>
      choose(/^Samples owner/, search, name),
    expectNoInstitution: () =>
      expect(page.getByRole("heading", { name: "Institution" })).toBeHidden(),
    expectPrefilled: async (prefill: {
      name: string;
      owner: string;
      samplesOwner: string;
    }) => {
      await expect(
        page.getByRole("textbox", { name: "Service name" }),
      ).toHaveValue(prefill.name);
      const requestedBy = page.getByRole("combobox", { name: /^Requested by/ });
      await expect(requestedBy).toContainText(prefill.owner);
      await expect(requestedBy).toBeDisabled();
      await expect(
        page.getByRole("combobox", { name: /^Samples owner/ }),
      ).toContainText(prefill.samplesOwner);
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
