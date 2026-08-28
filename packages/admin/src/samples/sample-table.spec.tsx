import type { SampleStatus } from "@projet-igsn/domain/sample/sample";
import type { AdminSampleListItem } from "@projet-igsn/domain/sample/sample-validator";

import { TooltipProvider } from "@projet-igsn/design-system/components/ui/tooltip";
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
  owner: { name: "Curie", firstname: "Marie", status: "accepted" },
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
  status: "draft",
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T10:00:00.000Z"),
};
const samples = [sample];

function renderTable(
  data: AdminSampleListItem[],
  onSortingChange = vi.fn(),
  moderated = false,
) {
  function Harness() {
    const [sorting, setSorting] = useState<SortingState>([]);
    return (
      <SampleTable
        samples={data}
        moderated={moderated}
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
  return render(
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>,
  );
}

describe("SampleTable", () => {
  it("should render the column headers with IGSN first", async () => {
    const screen = await renderTable(samples);
    await expect
      .element(screen.getByRole("row").nth(0))
      .toHaveTextContent(/^IGSN/);
  });

  it("should render the IGSN of a published sample", async () => {
    const screen = await renderTable([
      { ...sample, igsn: "01K072TVWVFK5A1RRZ5MY4PPK9", status: "published" },
    ]);
    await expect
      .element(screen.getByText("01K072TVWVFK5A1RRZ5MY4PPK9"))
      .toBeInTheDocument();
  });

  it.each<[SampleStatus, string]>([
    ["draft", "Draft"],
    ["published", "Published"],
    ["withdrawn", "Withdrawn"],
  ])("should badge a %s sample as %s", async (status, label) => {
    const screen = await renderTable([{ ...sample, status }]);
    await expect.element(screen.getByText(label)).toBeInTheDocument();
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

  it.each<[number, string, string]>([
    [0, "Status", "none"],
    [1, "Status ↑", "ascending"],
    [2, "Status ↓", "descending"],
  ])(
    "should announce the sort direction on the status column header after %i click(s)",
    async (clicks, name, direction) => {
      const screen = await renderTable(samples);

      for (let click = 0; click < clicks; click++) {
        await screen.getByRole("button", { name: /^Status/ }).click();
      }

      await expect
        .element(screen.getByRole("columnheader", { name }))
        .toHaveAttribute("aria-sort", direction);
    },
  );

  it.each(["IGSN", "Owner"])(
    "should announce no sort state on the %s column header, which cannot sort",
    async (name) => {
      const screen = await renderTable(samples);

      await expect
        .element(screen.getByRole("columnheader", { name }))
        .not.toHaveAttribute("aria-sort");
    },
  );

  it("should expose the full name of a truncated cell in a tooltip", async () => {
    const screen = await renderTable(samples);

    await screen
      .getByRole("link", { name: "Basalte du Massif Central" })
      .hover();

    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent("Basalte du Massif Central");
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

  it("should render the owner as initials, announced as the full name", async () => {
    const screen = await renderTable(samples);
    await expect
      .element(screen.getByTitle("Marie Curie"))
      .toHaveTextContent("MC");
    await expect
      .element(screen.getByRole("cell", { name: "Marie Curie", exact: true }))
      .toBeInTheDocument();
  });

  it("should render the owner account status when asked for it", async () => {
    const screen = await renderTable(samples, vi.fn(), true);
    await expect
      .element(screen.getByRole("cell", { name: /Marie Curie\s*Active/ }))
      .toBeInTheDocument();
  });

  it("should render no owner account status by default", async () => {
    const screen = await renderTable(samples);
    await expect
      .element(screen.getByRole("cell", { name: "Marie Curie", exact: true }))
      .toBeInTheDocument();
    expect(screen.getByText("Active").elements()).toHaveLength(0);
  });

  it.each<[string, AdminSampleListItem["owner"]]>([
    ["a nameless owner", { name: null, firstname: null, status: "accepted" }],
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

  it("should send a moderated sample's edit page back to the moderation list", async () => {
    const screen = await renderTable(samples, vi.fn(), true);
    await expect
      .element(screen.getByRole("link", { name: "Basalte du Massif Central" }))
      .toHaveAttribute(
        "href",
        "/samples/3f2504e0-4f89-41d3-9a0c-0305e82c3301?from=moderation",
      );
  });

  it("should navigate to the edit page when the row is clicked", async () => {
    const screen = await renderTable(samples);
    await screen.getByText("Thin section").click();
    await expect.element(screen.getByText("Edit page stub")).toBeVisible();
  });
});
