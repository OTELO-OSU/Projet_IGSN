import { expect, type Page } from "@playwright/test";

export function shareSamplePage(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Share this sample" });
  const inviteDialog = page.getByRole("dialog", {
    name: "Invite a contributor",
  });
  // The suggestions render in a popover, portaled outside the dialog.
  const colleague = (name: string) =>
    page.getByRole("option").filter({ hasText: name });
  const row = (email: string) =>
    dialog.getByRole("listitem").filter({ hasText: email });
  return {
    open: () => page.getByRole("button", { name: "Share" }).click(),
    close: () => dialog.getByRole("button", { name: "Close" }).click(),
    openPicker: async () => {
      await dialog.getByRole("button", { name: "Invite" }).click();
      await inviteDialog.getByRole("combobox", { name: "Email" }).click();
    },
    expectOwner: (name: string, email: string) =>
      expect(row(email)).toContainText(name),
    expectNoCollaborator: (email: string) => expect(row(email)).toHaveCount(0),
    expectColleagueOffered: (name: string) =>
      expect(colleague(name)).toBeVisible(),
    pickColleague: (name: string) => colleague(name).click(),
    invite: () =>
      inviteDialog.getByRole("button", { name: "Send invitation" }).click(),
    chooseRole: (role: "Editor" | "Contributor") =>
      inviteDialog.getByRole("radio", { name: new RegExp(`^${role}`) }).click(),
    expectCollaborator: (email: string) => expect(row(email)).toBeVisible(),
    expectCollaboratorRole: (email: string, role: string) =>
      expect(row(email)).toContainText(role),
    removeCollaborator: async (name: string) => {
      await dialog.getByRole("button", { name: `Remove ${name}` }).click();
      await page
        .getByRole("dialog", { name: "Remove this collaborator?" })
        .getByRole("button", { name: "Confirm" })
        .click();
    },
  };
}
