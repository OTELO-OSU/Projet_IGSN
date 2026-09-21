import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";
import { HttpResponse, http } from "msw";
import { vi } from "vitest";
import { userEvent } from "vitest/browser";

import { fillPersonName } from "../../test/fill-person-name.ts";
import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

const createAction = (onSubmit: (value: CreateSample) => void) =>
  ({ kind: "submit", label: "Create", onSubmit }) as const;

async function renderScientificContextSection(
  onSubmit: (value: CreateSample) => void = noop,
) {
  worker.use(
    http.get("*/admin/users/search", () => HttpResponse.json({ data: [] })),
  );
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
      primaryAction={createAction(onSubmit)}
    />,
  );
  return screen;
}

type Screen = Awaited<ReturnType<typeof renderScientificContextSection>>;

const pickProvenance = async (screen: Screen, option: string) => {
  await screen.getByRole("tab", { name: "Identity" }).click();
  await screen
    .getByRole("combobox", { name: "Provenance status *", exact: true })
    .click();
  await screen.getByRole("option", { name: option }).click();
  await screen.getByRole("tab", { name: "Scientific context" }).click();
};

const clearProvenance = async (screen: Screen) => {
  await screen.getByRole("tab", { name: "Identity" }).click();
  await screen
    .getByRole("combobox", { name: "Provenance status *", exact: true })
    .click();
  await screen.getByRole("option", { name: "Field sample" }).click();
};

const goToScientificContext = async (screen: Screen) => {
  await screen.getByRole("tab", { name: "Scientific context" }).click();
};

const pickOrganization = async (
  screen: Awaited<ReturnType<typeof renderScientificContextSection>>,
  ror: string,
) => {
  const label = organizationLabel(ror);
  await screen.getByPlaceholder("Search organizations...").fill(label);
  await screen.getByRole("option", { name: label }).click();
};

const closePopover = () => userEvent.keyboard("{Escape}");

describe("SampleScientificContextFields", () => {
  it("should disable the Scientific context tab until a provenance status is chosen", async () => {
    const screen = await renderScientificContextSection();

    await clearProvenance(screen);

    await expect
      .element(screen.getByRole("tab", { name: "Scientific context" }))
      .toBeDisabled();

    await screen
      .getByRole("combobox", { name: "Provenance status *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Field sample" }).click();

    await expect
      .element(screen.getByRole("tab", { name: "Scientific context" }))
      .toBeEnabled();
  });

  it("should submit a field sample with organizations picked from the reference list", async () => {
    const onSubmit = vi.fn();
    const screen = await renderScientificContextSection(onSubmit);

    await goToScientificContext(screen);
    await screen
      .getByRole("combobox", { name: "Funder organizations" })
      .click();
    await pickOrganization(screen, "02feahw73");
    await pickOrganization(screen, "04kdfz702");
    await screen
      .getByLabelText("Name of the research programme")
      .fill("Deep Biosphere Survey");
    await screen
      .getByRole("combobox", {
        name: "Host institution (project leader)",
      })
      .click();
    await pickOrganization(screen, "04kdfz702");
    await pickOrganization(screen, "05hnb7x64");
    await closePopover();
    await fillPersonName(screen, "Collector name", "Pierre", "Curie");
    await fillPersonName(
      screen,
      "Chief scientist / Project leader",
      "Marie",
      "Tharp",
    );
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          scientificContext: {
            provenanceStatus: "field_sample",
            funderOrganizations: ["02feahw73", "04kdfz702"],
            researchProgramName: "Deep Biosphere Survey",
            hostInstitution: ["04kdfz702", "05hnb7x64"],
            chiefScientistFirstname: "Marie",
            chiefScientistLastname: "Tharp",
            collectorFirstname: "Pierre",
            collectorLastname: "Curie",
          },
        }),
      ),
    );
  });

  it("should submit a collection specimen with its curator and origin", async () => {
    const onSubmit = vi.fn();
    const screen = await renderScientificContextSection(onSubmit);

    await pickProvenance(screen, "Collection specimen");
    await fillPersonName(
      screen,
      "Name of the collection curator",
      "Georges",
      "Cuvier",
    );
    await screen.getByRole("combobox", { name: "Collection origin *" }).click();
    await screen.getByRole("option", { name: "Purchase" }).click();
    await screen
      .getByLabelText("Open description of the collection context")
      .fill("Bought at auction in 1902");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          scientificContext: {
            provenanceStatus: "collection_specimen",
            collectionCuratorFirstname: "Georges",
            collectionCuratorLastname: "Cuvier",
            collectionOrigin: "purchase",
            collectionContextDescription: "Bought at auction in 1902",
          },
        }),
      ),
    );
  });

  it("should omit the scientific context when no provenance status is chosen", async () => {
    const onSubmit = vi.fn();
    const screen = await renderScientificContextSection(onSubmit);

    await clearProvenance(screen);
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).not.toHaveProperty("scientificContext");
  });

  it("should keep the hidden branch's values while editing and omit them from the payload", async () => {
    const onSubmit = vi.fn();
    const screen = await renderScientificContextSection(onSubmit);

    await goToScientificContext(screen);
    await screen
      .getByLabelText("Name of the research programme")
      .fill("Deep Biosphere Survey");
    await fillPersonName(screen, "Collector name", "Pierre", "Curie");
    await pickProvenance(screen, "Collection specimen");
    await expect
      .element(screen.getByLabelText("Name of the research programme"))
      .not.toBeInTheDocument();
    await expect
      .element(
        screen
          .getByRole("group", { name: "Collector name" })
          .getByRole("textbox", { name: /last name/i }),
      )
      .toHaveValue("Curie");

    await pickProvenance(screen, "Field sample");
    await expect
      .element(screen.getByLabelText("Name of the research programme"))
      .toHaveValue("Deep Biosphere Survey");

    await pickProvenance(screen, "Collection specimen");
    await fillPersonName(
      screen,
      "Name of the collection curator",
      "Georges",
      "Cuvier",
    );
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          scientificContext: {
            provenanceStatus: "collection_specimen",
            collectionCuratorFirstname: "Georges",
            collectionCuratorLastname: "Cuvier",
            collectorFirstname: "Pierre",
            collectorLastname: "Curie",
          },
        }),
      ),
    );
  });
});
