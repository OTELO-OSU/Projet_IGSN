import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import type { Hierarchy } from "../../lib/hierarchy.ts";

import { HierarchyInput } from "./hierarchy-input.tsx";

const hierarchy: Hierarchy = {
  roots: ["rock", "water"],
  nodes: {
    rock: { choices: ["igneous", "sedimentary"], childLabel: "rock_kind" },
    sedimentary: { optional: true, choices: ["sand"] },
    water: { optional: true, choices: ["water", "sea"] },
    "water.water": { label: "water_only" },
  },
};

const translate = (code: string) => {
  const segment = code.split(".").at(-1) ?? code;
  return (
    segment.charAt(0).toUpperCase() + segment.slice(1).replaceAll("_", " ")
  );
};

function Harness({
  selected = [],
  isSelectable,
}: {
  selected?: string[];
  isSelectable?: (path: string) => boolean;
} = {}) {
  const [value, setValue] = useState(selected);
  return (
    <HierarchyInput
      hierarchy={hierarchy}
      translate={translate}
      value={value}
      onChange={setValue}
      isSelectable={isSelectable}
      placeholder="Select a material"
      searchPlaceholder="Search material..."
      emptyText="No material found"
      stopLabel="Stop here"
      removeLabel={(label) => `Remove ${label}`}
    />
  );
}

const combobox = () => page.getByRole("combobox");
const searchInput = () => page.getByPlaceholder("Search material...");

const isSelectable = (path: string) =>
  path !== "rock.sedimentary" && !path.startsWith("water.");

describe("HierarchyInput", () => {
  it("should offer only the children isSelectable accepts", async () => {
    await render(<Harness isSelectable={isSelectable} />);

    await combobox().click();
    await page.getByRole("option", { name: "Rock" }).click();

    await expect
      .element(page.getByRole("option", { name: "Igneous" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("option", { name: "Sedimentary" }))
      .not.toBeInTheDocument();
  });

  it("should treat a node whose every child is filtered out as a leaf", async () => {
    await render(<Harness isSelectable={isSelectable} />);

    await combobox().click();
    await page.getByRole("option", { name: "Water" }).click();

    await expect.element(searchInput()).not.toBeInTheDocument();
    await expect.element(combobox()).toBeDisabled();
  });

  it("should render no refinement hint when no hint is given", async () => {
    await render(<Harness selected={["rock"]} />);

    await expect.element(page.getByText("> ...")).not.toBeInTheDocument();
  });
});
