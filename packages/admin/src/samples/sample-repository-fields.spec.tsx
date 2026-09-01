import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";
import { vi } from "vitest";

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
  await screen.getByRole("tab", { name: "Repository" }).click();
  return screen;
}

describe("SampleRepositoryFields", () => {
  it("should submit the current archive picked from the organization list with the other repository fields", async () => {
    const onSubmit = vi.fn();
    const screen = await renderRepositorySection(onSubmit);

    await screen.getByRole("combobox", { name: "Current archive *" }).click();
    await screen
      .getByPlaceholder("Search organizations...")
      .fill(organizationLabel("02feahw73"));
    await screen
      .getByRole("option", { name: organizationLabel("02feahw73") })
      .click();
    await screen
      .getByRole("textbox", { name: "Current archive contact" })
      .fill("curator@example.org");
    await screen
      .getByRole("textbox", { name: "Collection name" })
      .fill("Massif Central basalts");
    await screen
      .getByRole("textbox", { name: "Original archive", exact: true })
      .fill("Museum of Clermont-Ferrand");
    await screen
      .getByRole("textbox", { name: "Original archive contact" })
      .fill("archives@example.org");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: {
            currentArchive: "02feahw73",
            currentArchiveContact: "curator@example.org",
            collectionName: "Massif Central basalts",
            originalArchive: "Museum of Clermont-Ferrand",
            originalArchiveContact: "archives@example.org",
          },
        }),
      ),
    );
  });
});
