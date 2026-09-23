import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import {
  laboratoryLabel,
  organizationLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";
import { vi } from "vitest";
import { userEvent } from "vitest/browser";

import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

async function renderRepositorySection(
  onSubmit: (value: CreateSample) => void = noop,
) {
  const screen = await render(
    <SampleForm
      onCancel={noop}
      defaultValues={{
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        material: null,
        collectionMethod: null,
        collectionMethodDescription: null,
      }}
      primaryAction={{ kind: "submit", label: "Create", onSubmit }}
    />,
  );
  await screen.getByRole("tab", { name: "Curation and repository" }).click();
  return screen;
}

type Screen = Awaited<ReturnType<typeof renderRepositorySection>>;

const pick = async (screen: Screen, field: string, option: string) => {
  await screen.getByRole("combobox", { name: field }).click();
  await screen.getByPlaceholder(/^Search/).fill(option);
  await screen.getByRole("option", { name: option }).click();
};

describe("SampleRepositoryFields", () => {
  it("should submit the archive OSU, laboratory, collection, contact and rights holders", async () => {
    const onSubmit = vi.fn();
    const screen = await renderRepositorySection(onSubmit);

    const currentArchive = screen.getByRole("region", {
      name: "Current archive",
    });
    await pick(screen, "OSU", osuLabel("OSUNA"));
    await pick(screen, "UMR", laboratoryLabel("UMR6112"));
    await screen.getByRole("combobox", { name: "Rights holder" }).click();
    for (const ror of ["02feahw73", "04kdfz702"]) {
      await screen
        .getByPlaceholder("Search organizations...")
        .fill(organizationLabel(ror));
      await screen
        .getByRole("option", { name: organizationLabel(ror) })
        .click();
    }
    await userEvent.keyboard("{Escape}");
    await currentArchive
      .getByRole("textbox", { name: "First name" })
      .fill("Ada");
    await currentArchive
      .getByRole("textbox", { name: "Last name" })
      .fill("Lovelace");
    await screen
      .getByRole("textbox", { name: "Collection name" })
      .fill("Massif Central basalts");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: {
            currentArchiveOsu: "OSUNA",
            currentArchiveLaboratory: "UMR6112",
            currentArchiveContactFirstname: "Ada",
            currentArchiveContactLastname: "Lovelace",
            collectionName: "Massif Central basalts",
            rightsHolder: ["02feahw73", "04kdfz702"],
          },
        }),
      ),
    );
  });

  it("should narrow the laboratories to the picked OSU and clear the laboratory when it changes", async () => {
    const screen = await renderRepositorySection();

    await pick(screen, "OSU", osuLabel("OSUNA"));
    await screen.getByRole("combobox", { name: "UMR" }).click();
    await expect
      .element(screen.getByRole("option", { name: laboratoryLabel("UMR6112") }))
      .toBeVisible();
    expect(
      screen
        .getByRole("option", { name: laboratoryLabel("UMR6524") })
        .elements(),
    ).toHaveLength(0);
    await screen
      .getByRole("option", { name: laboratoryLabel("UMR6112") })
      .click();

    await pick(screen, "OSU", osuLabel("OPGC"));

    await expect
      .element(screen.getByRole("combobox", { name: "UMR" }))
      .toHaveTextContent("Select a laboratory");
  });

  it("should offer every laboratory while no OSU is picked", async () => {
    const screen = await renderRepositorySection();

    await pick(screen, "UMR", laboratoryLabel("UMR7327"));

    await expect
      .element(screen.getByRole("combobox", { name: "UMR" }))
      .toHaveTextContent(laboratoryLabel("UMR7327"));
  });
});
