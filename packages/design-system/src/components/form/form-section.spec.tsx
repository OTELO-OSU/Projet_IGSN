import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { FormSection } from "./form-section.tsx";

describe("FormSection", () => {
  it("should render the title as a heading above its children", async () => {
    await render(
      <FormSection title="Location">
        <p>Section content</p>
      </FormSection>,
    );

    await expect
      .element(page.getByRole("heading", { level: 2, name: "Location" }))
      .toBeVisible();
    await expect.element(page.getByText("Section content")).toBeVisible();
  });
});
