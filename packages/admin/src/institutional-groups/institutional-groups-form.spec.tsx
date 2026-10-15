import {
  laboratoryLabel,
  organizationLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";
import { vi } from "vitest";
import { page } from "vitest/browser";

import { CALLER_GROUPS } from "../../test/caller-groups.ts";
import { render } from "../../test/render.tsx";
import { InstitutionalGroupsForm } from "./institutional-groups-form.tsx";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { access_token: "tok" } }),
}));

const save = { mutate: () => {}, isPending: false };

const pick = async (field: RegExp, option: string) => {
  await page.getByRole("combobox", { name: field }).click();
  await page.getByPlaceholder(/^Search/).fill(option);
  await page.getByRole("option", { name: option }).click();
};

describe("InstitutionalGroupsForm", () => {
  it("should offer only the OSUs of the picked organization", async () => {
    await render(<InstitutionalGroupsForm save={save} />);

    await pick(/Organization/, organizationLabel("04vfs2w97"));
    await page.getByRole("combobox", { name: /OSU/ }).click();

    await expect
      .element(page.getByRole("option", { name: /OTELo/ }))
      .toBeVisible();
    expect(page.getByRole("option", { name: /OSUG/ }).elements()).toHaveLength(
      0,
    );
  });

  it("should narrow the laboratories to the OSU once one is picked", async () => {
    await render(<InstitutionalGroupsForm save={save} />);
    await pick(/Organization/, organizationLabel("014zrew76"));

    await page.getByRole("combobox", { name: /Laboratory/ }).click();
    await expect
      .element(page.getByRole("option", { name: /\(ORN\)/ }))
      .toBeVisible();
    await page.getByRole("option", { name: /\(ISTO\)/ }).click();

    await pick(/OSU/, osuLabel("OSUC"));
    await page.getByRole("combobox", { name: /Laboratory/ }).click();
    await expect
      .element(page.getByRole("option", { name: /\(ISTO\)/ }))
      .toBeVisible();
    expect(
      page.getByRole("option", { name: /\(ORN\)/ }).elements(),
    ).toHaveLength(0);
  });

  it("should not offer an organization that has no laboratory", async () => {
    await render(<InstitutionalGroupsForm save={save} />);

    await page.getByRole("combobox", { name: /Organization/ }).click();
    await page.getByPlaceholder(/^Search/).fill("INSU");

    expect(
      page.getByRole("option", { name: /CNRS - INSU/ }).elements(),
    ).toHaveLength(0);
  });

  it("should ask no confirmation while the change misses a laboratory", async () => {
    await render(
      <InstitutionalGroupsForm groups={CALLER_GROUPS} save={save} />,
    );

    await pick(/Organization/, organizationLabel("014zrew76"));
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

  it("should confirm a completed change of a saved institution", async () => {
    await render(
      <InstitutionalGroupsForm groups={CALLER_GROUPS} save={save} />,
    );

    await pick(/Organization/, organizationLabel("014zrew76"));
    await pick(/Laboratory/, laboratoryLabel("UMR7327"));
    await page.getByRole("button", { name: /save/i }).click();

    await expect
      .element(page.getByRole("heading", { name: /change your institution/i }))
      .toBeVisible();
  });

  it("should clear the OSU and laboratory when the organization changes", async () => {
    await render(<InstitutionalGroupsForm save={save} />);
    await pick(/Organization/, organizationLabel("04vfs2w97"));
    await pick(/OSU/, osuLabel("OTELo"));
    await pick(/Laboratory/, laboratoryLabel("UMR7358"));

    await pick(/Organization/, organizationLabel("014zrew76"));

    await expect
      .element(page.getByRole("combobox", { name: /OSU/ }))
      .toHaveTextContent("Select an OSU");
    await expect
      .element(page.getByRole("combobox", { name: /Laboratory/ }))
      .toHaveTextContent("Select a laboratory");
  });

  it("should not offer a replaced laboratory", async () => {
    await render(<InstitutionalGroupsForm save={save} />);
    await pick(/Organization/, organizationLabel("02feahw73"));
    await pick(/OSU/, osuLabel("OBSPM"));

    await page.getByRole("combobox", { name: /Laboratory/ }).click();
    await page.getByPlaceholder(/^Search/).fill("LIRA");

    await expect
      .element(
        page.getByRole("option", {
          name: /instrumentation et de recherche en astrophysique/,
        }),
      )
      .toBeVisible();
    expect(
      page.getByRole("option", { name: /Etudes Spatiales/ }).elements(),
    ).toHaveLength(0);
  });

  it("should keep showing a stored replaced laboratory", async () => {
    await render(
      <InstitutionalGroupsForm
        groups={{
          institutionalOrganization: "02feahw73",
          institutionalOsu: "OBSPM",
          institutionalLaboratory: "UMR8109",
        }}
        save={save}
      />,
    );

    await expect
      .element(page.getByRole("combobox", { name: /Laboratory/ }))
      .toHaveTextContent(/\(LIRA\)/);
  });
});
