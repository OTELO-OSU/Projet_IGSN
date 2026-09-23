import { expect, type Locator, type Page } from "@playwright/test";

import { pickHierarchyLevel } from "../pick-hierarchy.ts";
import { frontendUrl } from "../urls.ts";

const SYNTHETIC_MATERIAL = "Synthetic rock / mineral";

const additionalRoleName = (rank: number, role: string) =>
  new RegExp(`^${rank}\\. ${role}( \\*)?$`);

export function sampleFormPage(page: Page) {
  const openTab = (name: string) => page.getByRole("tab", { name }).click();
  const fieldCombobox = (field: string, scope: Locator | Page = page) =>
    scope.getByRole("combobox", {
      name: new RegExp(`^${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
    });
  const pick = async (
    field: string,
    label: string,
    scope: Locator | Page = page,
  ) => {
    const combobox = fieldCombobox(field, scope);
    await expect(async () => {
      if ((await combobox.innerText()).trim() !== label) {
        await combobox.click();
        await page.getByRole("option", { name: label, exact: true }).click();
      }
      await expect(page.getByRole("listbox")).toHaveCount(0);
      await expect(combobox).toHaveText(label, { timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
  };

  const pickHierarchy = (field: string, label: string) =>
    pickHierarchyLevel(page, fieldCombobox(field), label);

  const fillPersonName = async (
    person: RegExp,
    firstname: string,
    lastname: string,
  ) => {
    const group = page.getByRole("group", { name: person });
    await group.getByRole("combobox", { name: person }).click();
    await page
      .getByRole("option", { name: "Not in the list? Enter a name" })
      .click();
    await group.getByRole("textbox", { name: /first name/i }).fill(firstname);
    await group.getByRole("textbox", { name: /last name/i }).fill(lastname);
  };

  const confirm = (dialog: string) =>
    page
      .getByRole("dialog", { name: dialog })
      .getByRole("button", { name: "Confirm" })
      .click();
  const confirmStatusChange = async (action: string, dialog: string) => {
    await page.getByRole("button", { name: action, exact: true }).click();
    await confirm(dialog);
  };

  return {
    openTab,
    pick,
    confirm,
    confirmStatusChange,
    fillPersonName,

    expectHierarchyLevel: (label: string) =>
      expect(
        page.getByRole("button", { name: `Remove ${label}`, exact: true }),
      ).toBeVisible(),

    expectParentTab: async (parents: { name: string; igsn: string }[]) => {
      const label = parents.length > 1 ? "Parent samples" : "Parent sample";
      await expect(
        page.getByRole("tablist").getByRole("tab").first(),
      ).toHaveText(label);
      await openTab(label);
      const panel = page.getByRole("tabpanel");
      await expect(panel).toContainText("This sample is a sub sample of");
      for (const parent of parents) {
        await expect(
          panel.getByRole("link", { name: parent.name }),
        ).toHaveAttribute("href", `${frontendUrl}/samples/${parent.igsn}`);
      }
    },

    expectInheritedLocation: async (parentName: string) => {
      await openTab("Location");
      const panel = page.getByRole("tabpanel");
      await expect(panel).toContainText(
        "The location is inherited from the parent sample:",
      );
      await expect(panel.getByRole("link", { name: parentName })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Location", exact: true }),
      ).toHaveCount(0);
    },

    fillPublishableFields: async ({
      material = SYNTHETIC_MATERIAL,
      collectionDate = true,
    }: { material?: string | null; collectionDate?: boolean } = {}) => {
      await pickHierarchy("Type", "Dredge");
      await pick("Provenance status", "Collection specimen");
      if (collectionDate) {
        await page
          .getByRole("group", { name: /collection date/i })
          .getByRole("textbox", { name: /^Date/ })
          .fill("2025-06-15");
      }
      await openTab("Sample classification");
      if (material !== null) await pickHierarchy("Material", material);
      await openTab("Scientific context");
      await fillPersonName(/collection curator/i, "Paul", "Bernard");
      await pick("Collection origin", "Scientific expedition");
      await openTab("Curation and repository");
      await pick("Existence status", "Exists");
      await pick("Availability status", "Available");
      if (material !== null && material !== SYNTHETIC_MATERIAL) return;
      await openTab("Sample classification");
      await pick("Starting material", "Natural");
      await pick("Final product", "Glass");
      await page
        .getByRole("group", { name: /synthesis date/i })
        .getByRole("textbox", { name: /^Date/ })
        .fill("2025-06-15");
      await fillPersonName(/operator name/i, "Paul", "Bernard");
    },
    setPlatformType: async (label: string) => {
      await openTab("Scientific context");
      await pick("Platform type", label);
    },
    expectPlatformType: async (label: string) => {
      await openTab("Scientific context");
      await expect(fieldCombobox("Platform type")).toHaveText(label);
    },
    expectNoCollectionDate: () =>
      expect(page.getByRole("group", { name: /collection date/i })).toHaveCount(
        0,
      ),
    addAdditionalRole: async (
      role: string,
      { firstname, lastname }: { firstname: string; lastname: string },
    ) => {
      await openTab("Scientific context");
      const rank =
        (await page.getByRole("button", { name: /^Remove role / }).count()) + 1;
      await page.getByRole("button", { name: "Add a role" }).click();
      await page.getByRole("menuitem", { name: role, exact: true }).click();
      const person = additionalRoleName(rank, role);
      await expect(page.getByRole("group", { name: person })).toBeVisible();
      await fillPersonName(person, firstname, lastname);
    },
    expectAdditionalRole: async (
      index: number,
      role: string,
      { firstname, lastname }: { firstname: string; lastname: string },
    ) => {
      await openTab("Scientific context");
      const group = page.getByRole("group", {
        name: additionalRoleName(index, role),
      });
      await expect(
        group.getByRole("textbox", { name: /first name/i }),
      ).toHaveValue(firstname);
      await expect(
        group.getByRole("textbox", { name: /last name/i }),
      ).toHaveValue(lastname);
    },
    addProcessStep: async (
      kind: string,
      { date, description }: { date: string; description: string },
    ) => {
      await openTab("Identity");
      await page.getByRole("button", { name: "Add a process step" }).click();
      await page.getByRole("menuitem", { name: kind, exact: true }).click();
      const block = page.getByRole("group", {
        name: `1. ${kind} step`,
        exact: true,
      });
      await block.getByRole("textbox", { name: /^Date/ }).fill(date);
      await block.getByLabel("Description").fill(description);
    },
    setOriented: async (explanation: string) => {
      await openTab("Physical description");
      await page.getByRole("switch", { name: "Oriented sample" }).click();
      await page.getByLabel("Orientation explanation").fill(explanation);
    },
    publish: () => confirmStatusChange("Publish", "Publish sample"),
    publishAsWithdrawn: async () => {
      await page
        .getByRole("button", { name: "More publishing options" })
        .click();
      await page
        .getByRole("menuitem", { name: "Withdraw", exact: true })
        .click();
      await confirm("Publish sample as withdrawn");
    },
  };
}
