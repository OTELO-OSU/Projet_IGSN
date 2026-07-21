import type { CreateSample } from "@projet-igsn/domain/sample/sample";
import type { ReactElement } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SampleForm } from "./sample-form.tsx";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { access_token: "tok" } }),
}));

const SAMPLE_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const noop = () => {};

const saveAction = (onSubmit: (value: CreateSample) => void) =>
  ({ kind: "submit", label: "Save", onSubmit }) as const;

const renderForm = (ui: ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>,
  );

const defaultValues: CreateSample = {
  name: "Basalte du Massif Central",
  nature: "thin_section",
  type: null,
  material: null,
  collectionMethod: null,
  collectionMethodDescription: null,
  specificName: null,
  location: null,
};

const renderEditForm = (onSubmit: (value: CreateSample) => void) =>
  renderForm(
    <SampleForm
      onCancel={noop}
      defaultValues={defaultValues}
      primaryAction={saveAction(onSubmit)}
      sampleId={SAMPLE_ID}
    />,
  );

describe("SampleForm links tab", () => {
  it("should hide the Links tab during creation", async () => {
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={saveAction(vi.fn())} />,
    );

    await expect
      .element(screen.getByRole("tab", { name: "Sample classification" }))
      .toBeVisible();
    expect(screen.getByRole("tab", { name: "Links" }).query()).toBeNull();
  });

  it("should add a DOI link and submit it", async () => {
    const onSubmit = vi.fn();
    const screen = await renderEditForm(onSubmit);

    await screen.getByRole("tab", { name: "Links" }).click();
    await screen.getByRole("button", { name: "Add a link" }).click();
    await screen
      .getByLabelText("DOI URL 1")
      .fill("https://doi.org/10.1594/IEDA.100252");
    await screen.getByLabelText("Description 1").fill("Companion dataset");
    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          links: [
            {
              url: "https://doi.org/10.1594/IEDA.100252",
              description: "Companion dataset",
            },
          ],
        }),
      ),
    );
  });

  it("should reject a url that is not a DOI", async () => {
    const onSubmit = vi.fn();
    const screen = await renderEditForm(onSubmit);

    await screen.getByRole("tab", { name: "Links" }).click();
    await screen.getByRole("button", { name: "Add a link" }).click();
    await screen.getByLabelText("DOI URL 1").fill("https://example.com/paper");
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .element(screen.getByText("Enter a DOI URL (https://doi.org/...)."))
      .toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should reject a description without its url", async () => {
    const onSubmit = vi.fn();
    const screen = await renderEditForm(onSubmit);

    await screen.getByRole("tab", { name: "Links" }).click();
    await screen.getByRole("button", { name: "Add a link" }).click();
    await screen.getByLabelText("Description 1").fill("Orphan description");
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .element(screen.getByText("Enter a DOI URL (https://doi.org/...)."))
      .toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should remove a link row before saving", async () => {
    const onSubmit = vi.fn();
    const screen = await renderEditForm(onSubmit);

    await screen.getByRole("tab", { name: "Links" }).click();
    await screen.getByRole("button", { name: "Add a link" }).click();
    await screen
      .getByLabelText("DOI URL 1")
      .fill("https://doi.org/10.1594/IEDA.100252");
    await screen.getByRole("button", { name: "Remove link 1" }).click();
    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).not.toHaveProperty("links");
  });

  it("should prefill saved links", async () => {
    const screen = await renderForm(
      <SampleForm
        onCancel={noop}
        defaultValues={{
          ...defaultValues,
          links: [
            {
              url: "https://doi.org/10.1594/IEDA.100252",
              description: "Companion dataset",
            },
          ],
        }}
        primaryAction={saveAction(vi.fn())}
        sampleId={SAMPLE_ID}
      />,
    );

    await screen.getByRole("tab", { name: "Links" }).click();

    await expect
      .element(screen.getByLabelText("DOI URL 1"))
      .toHaveValue("https://doi.org/10.1594/IEDA.100252");
    await expect
      .element(screen.getByLabelText("Description 1"))
      .toHaveValue("Companion dataset");
  });
});
