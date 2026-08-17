import { vi } from "vitest";
import { page } from "vitest/browser";

import { CALLER_GROUPS } from "../../test/caller-groups.ts";
import { render } from "../../test/render.tsx";
import { InstitutionalGroupsForm } from "./institutional-groups-form.tsx";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { access_token: "tok" } }),
}));

const pick = async (field: RegExp, search: string, option: RegExp) => {
  await page.getByRole("combobox", { name: field }).click();
  await page.getByPlaceholder(/^Search/).fill(search);
  await page.getByRole("option", { name: option }).click();
};

describe("InstitutionalGroupsForm", () => {
  it("should offer only the OSUs of the picked organization", async () => {
    await render(<InstitutionalGroupsForm />);

    await pick(/Organization/, "Lorraine", /Université de Lorraine/);
    await page.getByRole("combobox", { name: /OSU/ }).click();

    await expect
      .element(page.getByRole("option", { name: /OTELo/ }))
      .toBeVisible();
    expect(page.getByRole("option", { name: /OSUG/ }).elements()).toHaveLength(
      0,
    );
  });

  it("should narrow the laboratories to the OSU once one is picked", async () => {
    await render(<InstitutionalGroupsForm />);
    await pick(/Organization/, "Orléans", /Université d'Orléans/);

    await page.getByRole("combobox", { name: /Laboratory/ }).click();
    await expect
      .element(page.getByRole("option", { name: /\(ORN\)/ }))
      .toBeVisible();
    await page.getByRole("option", { name: /\(ISTO\)/ }).click();

    await pick(/OSU/, "OSUC", /OSUC/);
    await page.getByRole("combobox", { name: /Laboratory/ }).click();
    await expect
      .element(page.getByRole("option", { name: /\(ISTO\)/ }))
      .toBeVisible();
    expect(
      page.getByRole("option", { name: /\(ORN\)/ }).elements(),
    ).toHaveLength(0);
  });

  it("should not offer an organization that has no laboratory", async () => {
    await render(<InstitutionalGroupsForm />);

    await page.getByRole("combobox", { name: /Organization/ }).click();
    await page.getByPlaceholder(/^Search/).fill("INSU");

    expect(
      page.getByRole("option", { name: /CNRS - INSU/ }).elements(),
    ).toHaveLength(0);
  });

  it("should ask no confirmation while the change misses a laboratory", async () => {
    await render(<InstitutionalGroupsForm groups={CALLER_GROUPS} />);

    await pick(/Organization/, "Orléans", /Université d'Orléans/);
    await page.getByRole("button", { name: /save/i }).click();

    await expect
      .element(page.getByText(/make a selection to continue/i))
      .toBeVisible();
    expect(
      page
        .getByRole("heading", { name: /change your institution/i })
        .elements(),
    ).toHaveLength(0);
  });

  it("should clear the OSU and laboratory when the organization changes", async () => {
    await render(<InstitutionalGroupsForm />);
    await pick(/Organization/, "Lorraine", /Université de Lorraine/);
    await pick(/OSU/, "OTELo", /OTELo/);
    await pick(/Laboratory/, "CRPG", /CRPG/);

    await pick(/Organization/, "Orléans", /Université d'Orléans/);

    await expect
      .element(page.getByRole("combobox", { name: /OSU/ }))
      .toHaveTextContent("Select an OSU");
    await expect
      .element(page.getByRole("combobox", { name: /Laboratory/ }))
      .toHaveTextContent("Select a laboratory");
  });
});
