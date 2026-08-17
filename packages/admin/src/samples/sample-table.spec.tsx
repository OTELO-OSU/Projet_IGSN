import type { AdminSampleListItem } from "@projet-igsn/domain/sample/sample-validator";

import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { type SortingState } from "@tanstack/react-table";
import { useState } from "react";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SampleTable } from "./sample-table.tsx";

const sample: AdminSampleListItem = {
  owner: { name: "Curie", firstname: "Marie" },
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  name: "Basalte du Massif Central",
  nature: "thin_section",
  type: null,
  material: null,
  texture: null,
  metamorphicFacies: null,
  collectionMethod: "coring.gravity_corer",
  collectionMethodDescription: null,
  specificName: "MC-2026-007",
  location: null,
  description: null,
  condition: null,
  scientificContext: null,
  age: null,
  links: [],
  attachments: [],
  security: null,
  availability: "exists",
  publicationYear: null,
  economicInterest: null,
  economicInterestElements: [],
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
  igsn: null,
  manualGroups: [],
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
  published: false,
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T10:00:00.000Z"),
};
const samples = [sample];

function renderTable(data: AdminSampleListItem[], onSortingChange = vi.fn()) {
  function Harness() {
    const [sorting, setSorting] = useState<SortingState>([]);
    return (
      <SampleTable
        samples={data}
        sorting={sorting}
        onSortingChange={(updater) => {
          setSorting(updater);
          onSortingChange(
            typeof updater === "function" ? updater(sorting) : updater,
          );
        }}
      />
    );
  }
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: Harness,
  });
  const editRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/samples/$sampleId",
    component: () => <p>Edit page stub</p>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, editRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

describe("SampleTable", () => {
  it("should render the column headers with IGSN first", async () => {
    const screen = await renderTable(samples);
    await expect
      .element(screen.getByRole("row").nth(0))
      .toHaveTextContent(/^IGSN/);
    await expect.element(screen.getByText("Status")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Name", { exact: true }))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Specific Name")).toBeInTheDocument();
    await expect.element(screen.getByText("Nature")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Collection Method"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Last modified")).toBeInTheDocument();
  });

  it("should render the IGSN of a published sample", async () => {
    const screen = await renderTable([
      { ...sample, igsn: "01K072TVWVFK5A1RRZ5MY4PPK9", published: true },
    ]);
    await expect
      .element(screen.getByText("01K072TVWVFK5A1RRZ5MY4PPK9"))
      .toBeInTheDocument();
  });

  it("should show a Published status when the sample has an IGSN", async () => {
    const screen = await renderTable([
      { ...sample, igsn: "01K072TVWVFK5A1RRZ5MY4PPK9", published: true },
    ]);
    await expect.element(screen.getByText("Published")).toBeInTheDocument();
  });

  it("should show a Draft status when the sample has no IGSN", async () => {
    const screen = await renderTable(samples);
    await expect.element(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("should request an asc then desc status sort when the header is clicked", async () => {
    const onSortingChange = vi.fn();
    const screen = await renderTable(samples, onSortingChange);

    await screen.getByRole("button", { name: "Status" }).click();
    expect(onSortingChange).toHaveBeenLastCalledWith([
      { id: "status", desc: false },
    ]);

    await screen.getByRole("button", { name: "Status ↑" }).click();
    expect(onSortingChange).toHaveBeenLastCalledWith([
      { id: "status", desc: true },
    ]);
  });

  it("should render a sample row with the last-modified date as yyyy-mm-dd", async () => {
    const screen = await renderTable(samples);
    await expect
      .element(screen.getByText("Basalte du Massif Central"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("MC-2026-007")).toBeInTheDocument();
    await expect.element(screen.getByText("Thin section")).toBeInTheDocument();
    await expect.element(screen.getByText("GravityCorer")).toBeInTheDocument();
    await expect.element(screen.getByText("2026-07-01")).toBeInTheDocument();
  });

  it("should render the owner initials with the full name as title", async () => {
    const screen = await renderTable(samples);
    await expect
      .element(screen.getByTitle("Marie Curie"))
      .toHaveTextContent("MC");
  });

  it("should announce the owner full name, not the initials", async () => {
    const screen = await renderTable(samples);
    await expect
      .element(screen.getByRole("cell", { name: "Marie Curie", exact: true }))
      .toBeInTheDocument();
  });

  it.each<[string, AdminSampleListItem["owner"]]>([
    ["a nameless owner", { name: null, firstname: null }],
    ["no owner", null],
  ])("should render an empty owner cell for %s", async (_, owner) => {
    const screen = await renderTable([{ ...sample, owner }]);
    await expect
      .element(screen.getByText("Basalte du Massif Central"))
      .toBeInTheDocument();
    expect(screen.getByTitle("Marie Curie").elements()).toHaveLength(0);
  });

  it("should show an empty state when there are no samples", async () => {
    const screen = await renderTable([]);
    await expect.element(screen.getByText("No results")).toBeInTheDocument();
  });

  it("should link the sample name to its edit page", async () => {
    const screen = await renderTable(samples);
    await expect
      .element(screen.getByRole("link", { name: "Basalte du Massif Central" }))
      .toHaveAttribute("href", "/samples/3f2504e0-4f89-41d3-9a0c-0305e82c3301");
  });

  it("should render a row whose sample has no specific name", async () => {
    const screen = await renderTable([{ ...sample, specificName: null }]);
    await expect
      .element(screen.getByRole("link", { name: "Basalte du Massif Central" }))
      .toBeVisible();
  });

  it("should navigate to the edit page when the row is clicked", async () => {
    const screen = await renderTable(samples);
    await screen.getByText("Thin section").click();
    await expect.element(screen.getByText("Edit page stub")).toBeVisible();
  });
});
