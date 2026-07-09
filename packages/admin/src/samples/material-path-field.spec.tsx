import { useState } from "react";
import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { MaterialPathField } from "./material-path-field.tsx";

test("should drill down and emit the deepest path", async () => {
  const onChange = vi.fn();
  function Wrapper() {
    const [value, setValue] = useState("");
    return (
      <MaterialPathField
        value={value}
        onChange={(path) => {
          setValue(path);
          onChange(path);
        }}
      />
    );
  }
  await render(<Wrapper />);

  await page.getByRole("combobox", { name: /material/i }).click();
  await page.getByRole("option", { name: "Rock", exact: true }).click();
  await page.getByRole("combobox", { name: /^rock$/i }).click();
  await page.getByRole("option", { name: "Igneous" }).click();

  expect(onChange).toHaveBeenLastCalledWith("rock.igneous");
});

test("should render one selector per level plus the trailing selector for an internal node", async () => {
  const onChange = vi.fn();
  await render(<MaterialPathField value="rock" onChange={onChange} />);
  // rock, and the trailing selector for its children = 2 comboboxes.
  await expect.element(page.getByRole("combobox").first()).toBeVisible();
  expect(page.getByRole("combobox").all()).toHaveLength(2);
});

test("should render a single selector for a leaf root", async () => {
  const onChange = vi.fn();
  await render(<MaterialPathField value="fossil" onChange={onChange} />);
  await expect.element(page.getByRole("combobox").first()).toBeVisible();
  expect(page.getByRole("combobox").all()).toHaveLength(1);
});
