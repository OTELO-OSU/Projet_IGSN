import { expect, type Page } from "@playwright/test";

import { chooseOption } from "./choose-option.ts";
import { attachManualGroup } from "./manual-groups-field.ts";

export function userPage(page: Page) {
  const groupsField = page.getByRole("combobox", {
    name: "Manual groups",
    exact: true,
  });
  const statusField = page.getByRole("combobox", {
    name: "Status",
    exact: true,
  });

  const save = async () => {
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Account updated")).toBeVisible();
  };

  return {
    expectVisible: (email: string) =>
      expect(page.getByText(email)).toBeVisible(),
    associateGroup: async (name: string) => {
      await attachManualGroup(page, "Manual groups", name);
      await save();
    },
    expectGroup: (name: string) =>
      expect(
        page.getByRole("button", { name: `Detach ${name}` }),
      ).toBeVisible(),
    expectGroupsReadOnly: () => expect(groupsField).toBeDisabled(),
    save,
    setStatus: async (status: string) => {
      await chooseOption(page)("Status", status);
      await save();
    },
    expectStatus: (status: string) => expect(statusField).toContainText(status),
    expectNotFound: () =>
      expect(page.getByRole("alert")).toContainText("does not exist"),
  };
}
