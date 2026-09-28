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
    await expect
      .element(page.getByRole("region", { name: "Location" }))
      .toHaveTextContent("Section content");
  });

  it("should head a nested section one level below and show its action", async () => {
    await render(
      <FormSection
        level={3}
        title="Numeric age"
        action={<button type="button">Enable</button>}
      >
        <p>Section content</p>
      </FormSection>,
    );

    await expect
      .element(page.getByRole("heading", { level: 3, name: "Numeric age" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Enable" }))
      .toBeVisible();
  });

  it("should describe the section with its description, rendered under the title", async () => {
    await render(
      <FormSection title="Services" description="Machine accounts you own">
        <span>Section content</span>
      </FormSection>,
    );

    const region = page.getByRole("region", { name: "Services" });
    await expect
      .element(region)
      .toHaveAccessibleDescription("Machine accounts you own");
    const heading = page.getByRole("heading", { name: "Services" }).element();
    const description = page.getByText("Machine accounts you own").element();
    expect(
      heading.compareDocumentPosition(description) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("should leave the section undescribed without a description", async () => {
    await render(
      <FormSection title="Services">
        <span>Section content</span>
      </FormSection>,
    );

    await expect
      .element(page.getByRole("region", { name: "Services" }))
      .not.toHaveAttribute("aria-describedby");
    await expect.element(page.getByRole("paragraph")).not.toBeInTheDocument();
  });
});
