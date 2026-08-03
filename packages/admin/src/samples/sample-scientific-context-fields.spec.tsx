import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { organizationLabel } from "@projet-igsn/domain/sample/scientific-context/organization-label";
import { vi } from "vitest";

import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { access_token: "tok" } }),
}));

const noop = () => {};

const createAction = (onSubmit: (value: CreateSample) => void) =>
  ({ kind: "submit", label: "Create", onSubmit }) as const;

// Renders the form with the required fields prefilled and opens the
// Scientific context tab, so each test only drives its inputs.
async function renderScientificContextSection(
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
      primaryAction={createAction(onSubmit)}
    />,
  );
  await screen.getByRole("tab", { name: "Scientific context" }).click();
  return screen;
}

const pickProvenance = async (
  screen: Awaited<ReturnType<typeof renderScientificContextSection>>,
  option: string,
) => {
  await screen
    .getByRole("combobox", { name: "Provenance status *", exact: true })
    .click();
  await screen.getByRole("option", { name: option }).click();
};

// Searches and picks by the label the combobox actually renders, derived from
// the ROR id. The list is refreshed from ROR, so a name typed in here would
// drift; the id is the stable code and the sync never rewrites one. Assumes the
// organization combobox is already open.
const pickOrganization = async (
  screen: Awaited<ReturnType<typeof renderScientificContextSection>>,
  ror: string,
) => {
  const label = organizationLabel(ror);
  await screen.getByPlaceholder("Search organizations...").fill(label);
  await screen.getByRole("option", { name: label }).click();
};

describe("SampleScientificContextFields", () => {
  it("should show no branch field until a provenance status is chosen", async () => {
    const screen = await renderScientificContextSection();

    await expect
      .element(screen.getByRole("combobox", { name: "Provenance status *" }))
      .toBeVisible();
    await expect
      .element(screen.getByLabelText(/collection curator/i))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByLabelText(/research programme/i))
      .not.toBeInTheDocument();
  });

  it("should submit a recent collection with organizations picked from the reference list", async () => {
    const onSubmit = vi.fn();
    const screen = await renderScientificContextSection(onSubmit);

    await pickProvenance(screen, "Recent collection");
    await screen
      .getByRole("combobox", { name: "Funder organization *" })
      .click();
    await pickOrganization(screen, "02feahw73");
    await screen
      .getByLabelText("Name of the research programme *")
      .fill("Deep Biosphere Survey");
    // The research structure is a multi-select: two picks, two chips.
    await screen
      .getByRole("combobox", {
        name: "Research structure of the programme chief *",
      })
      .click();
    await pickOrganization(screen, "04kdfz702");
    await pickOrganization(screen, "05hnb7x64");
    await screen.getByLabelText("Collector name *").fill("Pierre Curie");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          scientificContext: {
            provenanceStatus: "recent_collection",
            funderOrganization: "02feahw73",
            researchProgramName: "Deep Biosphere Survey",
            researchStructure: ["04kdfz702", "05hnb7x64"],
            collectorName: "Pierre Curie",
          },
        }),
      ),
    );
  });

  it("should submit a historical specimen with its curator and origin", async () => {
    const onSubmit = vi.fn();
    const screen = await renderScientificContextSection(onSubmit);

    await pickProvenance(screen, "Collection / historical specimen");
    await screen
      .getByLabelText("Name of the collection curator *")
      .fill("Georges Cuvier");
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
            provenanceStatus: "historical_specimen",
            collectionCurator: "Georges Cuvier",
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

    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).not.toHaveProperty("scientificContext");
  });

  it("should keep the hidden branch's values while editing and omit them from the payload", async () => {
    const onSubmit = vi.fn();
    const screen = await renderScientificContextSection(onSubmit);

    // Enter recent-collection values, then switch branch: the other branch's
    // fields hide but keep their values (ADR 0015), so switching back
    // restores them.
    await pickProvenance(screen, "Recent collection");
    await screen
      .getByLabelText("Name of the research programme *")
      .fill("Deep Biosphere Survey");
    await screen.getByLabelText("Collector name *").fill("Pierre Curie");
    await pickProvenance(screen, "Collection / historical specimen");
    await expect
      .element(screen.getByLabelText("Name of the research programme *"))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByLabelText("Collector name"))
      .toHaveValue("Pierre Curie");

    // Switching back restores the recent branch as entered.
    await pickProvenance(screen, "Recent collection");
    await expect
      .element(screen.getByLabelText("Name of the research programme *"))
      .toHaveValue("Deep Biosphere Survey");

    // And the submitted payload only ever carries the active branch.
    await pickProvenance(screen, "Collection / historical specimen");
    await screen
      .getByLabelText("Name of the collection curator *")
      .fill("Georges Cuvier");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          scientificContext: {
            provenanceStatus: "historical_specimen",
            collectionCurator: "Georges Cuvier",
            collectorName: "Pierre Curie",
          },
        }),
      ),
    );
  });
});
