import { expect, type Page } from "@playwright/test";

import { chooseOption } from "./choose-option.ts";

export function settingsPage(page: Page) {
  const item = (name: string) =>
    page.getByRole("listitem").filter({ hasText: name });

  return {
    open: async () => {
      await page.getByRole("banner").getByRole("button").click();
      await page.getByRole("menuitem", { name: "Settings" }).click();
      await expect(
        page.getByRole("heading", { name: "Settings" }),
      ).toBeVisible();
    },
    mySamplesLink: () =>
      page.getByRole("textbox", { name: "My samples link" }).inputValue(),
    groupSamplesLink: async (name: string) => {
      await chooseOption(page)("Group", name);
      return page
        .getByRole("textbox", { name: "Group samples link" })
        .inputValue();
    },
    setOrcid: async (orcid: string) => {
      const form = page.getByRole("form", { name: "ORCID iD" });
      await form.getByLabel("ORCID iD").fill(orcid);
      await form.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("ORCID iD saved")).toBeVisible();
    },
    setInstitution: async (groups: {
      organization: string;
      osu: string;
      laboratory: string;
    }) => {
      const form = page.getByRole("form", { name: "Institution" });
      const choose = chooseOption(page, form);
      await choose("Organization", groups.organization);
      await choose("OSU", groups.osu);
      await choose("Laboratory", groups.laboratory);
      await form.getByRole("button", { name: "Save" }).click();
      await page.getByRole("button", { name: "Confirm" }).click();
      await expect(page.getByText("Institution saved")).toBeVisible();
    },
    expectInstitution: (laboratory: string) =>
      expect(
        page
          .getByRole("form", { name: "Institution" })
          .getByRole("combobox", { name: "Laboratory" }),
      ).toContainText(laboratory),
    expectService: (name: string) => expect(item(name)).toBeVisible(),
    generateApiKey: async (name: string) => {
      await item(name)
        .getByRole("button", { name: "Generate API key" })
        .click();
      return item(name).getByRole("textbox", { name: "API key" }).inputValue();
    },
    expectManualGroup: (name: string) => expect(item(name)).toBeVisible(),
    expectNoManualGroup: (name: string) => expect(item(name)).toHaveCount(0),
    expectManualGroupLeaveLocked: async (name: string) => {
      await expect(
        page.getByRole("button", { name: `Leave ${name}` }),
      ).toBeDisabled();
      await expect(
        item(name).getByText(
          "You cannot leave this group while you own a published sample attached to it.",
        ),
      ).toBeVisible();
    },
    leaveManualGroup: async (name: string) => {
      const dialog = page.getByRole("dialog", {
        name: "Leave this manual group?",
      });
      await page.getByRole("button", { name: `Leave ${name}` }).click();
      await dialog.getByRole("button", { name: "Leave", exact: true }).click();
      await expect(dialog).toBeHidden();
    },
    expectNoManualGroupEditControl: async () => {
      await expect(
        page.getByRole("textbox", { name: "Group name" }),
      ).toBeHidden();
      await expect(
        page.getByRole("button", { name: "Associate a user" }),
      ).toBeHidden();
    },
  };
}
