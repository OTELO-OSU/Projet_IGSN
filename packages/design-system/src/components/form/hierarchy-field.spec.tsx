import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import type { Hierarchy } from "../../lib/hierarchy.ts";

import { useAppForm } from "./app-form.tsx";
import { FieldDisabledProvider } from "./field-disabled-context.tsx";

const hierarchy: Hierarchy = {
  roots: ["rock", "water"],
  nodes: {
    rock: { choices: ["igneous", "sedimentary"] },
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

const MUST_REFINE = "Refinement required";
const CAN_REFINE = "Can be refined";

function Harness({
  onSubmit = () => {},
  selected = [],
  rule,
  disabled,
}: {
  onSubmit?: (value: string[]) => void;
  selected?: string[];
  rule?: (name: string) => boolean;
  disabled?: boolean;
} = {}) {
  const form = useAppForm({
    defaultValues: { material: selected },
    onSubmit: ({ value }) => onSubmit(value.material),
  });
  const hierarchyField = (
    <form.AppField
      name="material"
      validators={{
        onSubmit: ({ value }: { value: string[] }) =>
          value.length > 0 ? undefined : { message: "Material is required" },
      }}
    >
      {(field) => (
        <field.HierarchyField
          label="Material"
          hierarchy={hierarchy}
          translate={translate}
          placeholder="Select a material"
          searchPlaceholder="Search material..."
          emptyText="No material found"
          stopLabel="Stop here"
          removeLabel={(label) => `Remove ${label}`}
          mustRefineText={MUST_REFINE}
          canRefineText={CAN_REFINE}
          disabled={disabled}
        />
      )}
    </form.AppField>
  );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      {rule ? (
        <FieldDisabledProvider value={rule}>
          {hierarchyField}
        </FieldDisabledProvider>
      ) : (
        hierarchyField
      )}
      <button type="submit">Save</button>
    </form>
  );
}

const combobox = () => page.getByRole("combobox", { name: "Material" });
const searchInput = () => page.getByPlaceholder("Search material...");

describe("HierarchyField", () => {
  it("should add a chip for a picked node and stay open on the next level, headed by the stop item", async () => {
    await render(<Harness />);

    await combobox().click();
    await page.getByRole("option", { name: "Rock" }).click();

    await expect
      .element(page.getByRole("button", { name: "Rock", exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByRole("option", { name: "Igneous" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("option").first())
      .toHaveTextContent("Stop here");
  });

  it("should close on a leaf and submit the cumulative prefixes", async () => {
    const onSubmit = vi.fn();
    await render(<Harness onSubmit={onSubmit} />);

    await combobox().click();
    await page.getByRole("option", { name: "Rock" }).click();
    await page.getByRole("option", { name: "Igneous" }).click();

    await expect.element(searchInput()).not.toBeInTheDocument();

    await page.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(["rock", "rock.igneous"]),
    );
  });

  it("should close without changing the value when the stop item is picked", async () => {
    const onSubmit = vi.fn();
    await render(
      <Harness onSubmit={onSubmit} selected={["rock", "rock.sedimentary"]} />,
    );

    await combobox().click();
    await page.getByRole("option", { name: "Stop here" }).click();

    await expect.element(searchInput()).not.toBeInTheDocument();

    await page.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(["rock", "rock.sedimentary"]),
    );
  });

  it.each([
    { selected: ["rock"], shown: [MUST_REFINE], hidden: [CAN_REFINE] },
    {
      selected: ["rock", "rock.sedimentary"],
      shown: [CAN_REFINE],
      hidden: [MUST_REFINE],
    },
    {
      selected: ["rock", "rock.igneous"],
      shown: [],
      hidden: [MUST_REFINE, CAN_REFINE],
    },
  ])(
    "should hint the completeness of $selected",
    async ({ selected, shown, hidden }) => {
      await render(<Harness selected={selected} />);

      for (const text of shown) {
        await expect.element(page.getByText(text)).toBeInTheDocument();
      }
      for (const text of hidden) {
        await expect.element(page.getByText(text)).not.toBeInTheDocument();
      }
    },
  );

  it("should drop every deeper chip when a chip is removed", async () => {
    const onSubmit = vi.fn();
    await render(
      <Harness
        onSubmit={onSubmit}
        selected={["rock", "rock.sedimentary", "rock.sedimentary.sand"]}
      />,
    );

    await page.getByRole("button", { name: "Remove Sedimentary" }).click();

    await expect.element(page.getByText("Sand")).not.toBeInTheDocument();

    await page.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith(["rock"]));
  });

  it("should list a clicked chip's siblings checked and dimmed, with no stop item", async () => {
    await render(<Harness selected={["rock", "rock.igneous"]} />);

    await page.getByRole("button", { name: "Rock", exact: true }).click();

    await expect
      .element(page.getByRole("option", { name: "Water" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("option", { name: "Rock" }))
      .toHaveAttribute("aria-checked", "true");
    await expect
      .element(page.getByRole("option", { name: "Stop here" }))
      .not.toBeInTheDocument();
    expect(
      page
        .getByRole("button", { name: "Igneous", exact: true })
        .element()
        .closest("[data-slot='badge']"),
    ).toHaveClass("opacity-50");
  });

  it("should replace a chip and drop the deeper ones when another sibling is picked", async () => {
    const onSubmit = vi.fn();
    await render(
      <Harness onSubmit={onSubmit} selected={["rock", "rock.igneous"]} />,
    );

    await page.getByRole("button", { name: "Rock", exact: true }).click();
    await page.getByRole("option", { name: "Water" }).click();

    await expect.element(page.getByText("Igneous")).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("option", { name: "Water only" }))
      .toBeVisible();

    await page.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith(["water"]));
  });

  it("should keep the path whole when the current node is picked again", async () => {
    const onSubmit = vi.fn();
    await render(
      <Harness onSubmit={onSubmit} selected={["rock", "rock.igneous"]} />,
    );

    await page.getByRole("button", { name: "Rock", exact: true }).click();
    await page.getByRole("option", { name: "Rock" }).click();

    await expect
      .element(page.getByRole("option", { name: "Igneous" }))
      .toHaveAttribute("aria-checked", "true");

    await page.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(["rock", "rock.igneous"]),
    );
  });

  it("should filter the current level only and clear the search after a pick", async () => {
    await render(<Harness />);

    await combobox().click();
    await searchInput().fill("wat");

    await expect
      .element(page.getByRole("option", { name: "Water" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("option", { name: "Rock" }))
      .not.toBeInTheDocument();

    await page.getByRole("option", { name: "Water" }).click();

    await expect.element(searchInput()).toHaveValue("");
    await expect
      .element(page.getByRole("option", { name: "Sea" }))
      .toBeVisible();
  });

  it("should render a locked level as plain text and keep the deeper chips removable", async () => {
    await render(
      <Harness
        selected={["rock", "rock.igneous"]}
        rule={(name) => name === "material[0]"}
      />,
    );

    await expect.element(page.getByText("Rock")).toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "Rock", exact: true }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "Remove Rock" }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "Remove Igneous" }))
      .toBeEnabled();
  });

  it("should disable the trigger when the level it would append is locked", async () => {
    await render(
      <Harness
        selected={["rock", "rock.sedimentary"]}
        rule={(name) => name === "material[2]"}
      />,
    );

    await expect.element(combobox()).toBeDisabled();
  });

  it("should disable the trigger and every chip button when disabled", async () => {
    await render(<Harness selected={["rock", "rock.sedimentary"]} disabled />);

    await expect.element(combobox()).toBeDisabled();
    await expect
      .element(page.getByRole("button", { name: "Remove Sedimentary" }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "Sedimentary", exact: true }))
      .not.toBeInTheDocument();
  });

  it("should announce an accessible error when invalid", async () => {
    await render(<Harness />);

    await page.getByRole("button", { name: "Save" }).click();

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Material is required");
    await expect.element(combobox()).toHaveAttribute("aria-invalid", "true");
  });
});
