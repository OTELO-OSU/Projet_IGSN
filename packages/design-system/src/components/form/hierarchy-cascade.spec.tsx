import { useId, useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { Combobox } from "../ui/combobox.tsx";
import { Label } from "../ui/label.tsx";
import { HierarchyCascade, selectedChild } from "./hierarchy-cascade.tsx";
import {
  type Hierarchy,
  hierarchyLevelItems,
} from "./hierarchy-select-field.tsx";

const translate = (code: string) => code.split(".").at(-1) ?? code;

// rock -> {igneous (leaf), sedimentary -> sand}. igneous has no entry, so its
// level offers nothing and ends the cascade.
const hierarchy: Hierarchy = {
  roots: ["rock"],
  nodes: {
    rock: { choices: ["igneous", "sedimentary"] },
    sedimentary: { choices: ["sand"] },
  },
};

describe("selectedChild", () => {
  it("should be blank for a blank value", () => {
    expect(selectedChild(null, "")).toBe("");
    expect(selectedChild("rock", undefined)).toBe("");
  });

  it("should be blank when the value is shallower than the parent depth", () => {
    expect(selectedChild("rock.sedimentary", "rock")).toBe("");
  });

  it("should be blank when the value does not descend through the parent", () => {
    expect(selectedChild("rock", "water.sea")).toBe("");
  });

  it("should return the child prefix when the value descends through the parent", () => {
    expect(selectedChild("rock", "rock.sedimentary.sand")).toBe(
      "rock.sedimentary",
    );
  });

  it("should return the root child at the top level", () => {
    expect(selectedChild(null, "rock.sedimentary")).toBe("rock");
  });
});

function RawLevel({
  label,
  items,
  current,
  onPick,
}: {
  label: string;
  items: { value: string; label: string }[];
  current: string;
  onPick: (picked: string | undefined) => void;
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Combobox
        id={id}
        items={items}
        value={current}
        onChange={(picked) => onPick(picked || undefined)}
        placeholder="Select"
        searchPlaceholder="Search"
        emptyText="None"
      />
    </div>
  );
}

function Harness() {
  const [value, setValue] = useState<string | undefined>(undefined);
  return (
    <HierarchyCascade
      hierarchy={hierarchy}
      translate={translate}
      value={value}
      onChange={setValue}
      rootLabel="Material"
      itemsAt={(parent) => hierarchyLevelItems(hierarchy, parent, translate)}
      renderLevel={({ label, items, current, onPick }) => (
        <RawLevel
          label={label}
          items={items}
          current={current}
          onPick={onPick}
        />
      )}
    />
  );
}

describe("HierarchyCascade", () => {
  it("should reveal the next level once a level is picked", async () => {
    await render(<Harness />);

    await page.getByRole("combobox", { name: "Material" }).click();
    await page.getByRole("option", { name: "rock" }).click();

    await expect
      .element(page.getByRole("combobox", { name: "rock" }))
      .toBeVisible();
  });

  it("should end the cascade at a level whose items are empty", async () => {
    await render(<Harness />);

    await page.getByRole("combobox", { name: "Material" }).click();
    await page.getByRole("option", { name: "rock" }).click();
    await page.getByRole("combobox", { name: "rock" }).click();
    await page.getByRole("option", { name: "igneous" }).click();

    // igneous is a childless leaf: no deeper level opens.
    await expect
      .element(page.getByRole("combobox", { name: "igneous" }))
      .not.toBeInTheDocument();
  });

  it("should drop deeper levels when a level is cleared", async () => {
    await render(<Harness />);

    await page.getByRole("combobox", { name: "Material" }).click();
    await page.getByRole("option", { name: "rock" }).click();
    await page.getByRole("combobox", { name: "rock" }).click();
    await page.getByRole("option", { name: "sedimentary" }).click();

    await expect
      .element(page.getByRole("combobox", { name: "sedimentary" }))
      .toBeVisible();

    // Re-picking the current child clears it back to the parent, so the
    // sedimentary level (its children) disappears.
    await page.getByRole("combobox", { name: "rock" }).click();
    await page.getByRole("option", { name: "sedimentary" }).click();

    await expect
      .element(page.getByRole("combobox", { name: "sedimentary" }))
      .not.toBeInTheDocument();
  });
});
