import type { Sample } from "@projet-igsn/domain/sample/sample";

import { render } from "vitest-browser-react";

import { SampleTable } from "./sample-table.tsx";

const samples: Sample[] = [
  {
    id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    name: "Basalte du Massif Central",
    nature: "thin_section",
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T10:00:00.000Z"),
  },
];

describe("SampleTable", () => {
  it("should render the column headers", async () => {
    const screen = await render(<SampleTable samples={samples} />);
    await expect.element(screen.getByText("Name")).toBeInTheDocument();
    await expect.element(screen.getByText("Nature")).toBeInTheDocument();
    await expect.element(screen.getByText("Last modified")).toBeInTheDocument();
  });

  it("should render a sample row with the last-modified date as yyyy-mm-dd", async () => {
    const screen = await render(<SampleTable samples={samples} />);
    await expect
      .element(screen.getByText("Basalte du Massif Central"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Thin section")).toBeInTheDocument();
    await expect.element(screen.getByText("2026-07-01")).toBeInTheDocument();
  });

  it("should show an empty state when there are no samples", async () => {
    const screen = await render(<SampleTable samples={[]} />);
    await expect.element(screen.getByText("No results")).toBeInTheDocument();
  });
});
