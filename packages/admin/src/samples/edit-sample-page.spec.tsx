import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { routeTree } from "../routeTree.gen.ts";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    user: {
      access_token: "tok",
      profile: { identity_provider: "shibboleth", name: "Marie Dupont" },
    },
  }),
}));

const IGSN = "01K072TVWVFK5A1RRZ5MY4PPK9";

// In-memory API: GET returns the current sample, PUT saves it, POST /publish
// publishes it. Records write calls so tests can assert the save-then-publish
// order. Lets the page run its real save/refetch cycle without a backend.
function fakeApi(published = false, fail: "save" | "publish" | false = false) {
  let sample = {
    id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    name: "Basalte du Massif Central",
    nature: "thin_section",
    type: null,
    igsn: published ? IGSN : null,
    published,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
  };
  const calls: string[] = [];
  vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (
      (fail === "save" && init?.method === "PUT") ||
      (fail === "publish" && init?.method === "POST")
    ) {
      return new Response(null, { status: 500 });
    }
    if (init?.method === "PUT" && typeof init.body === "string") {
      sample = { ...sample, ...JSON.parse(init.body) };
      calls.push(`PUT ${sample.name}`);
    }
    if (init?.method === "POST" && url.endsWith("/publish")) {
      sample = { ...sample, published: true, igsn: IGSN };
      calls.push("PUBLISH");
    }
    const body = url.includes("samples?")
      ? { data: [sample], meta: { total: 1 } }
      : { data: sample };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  return { id: sample.id, calls };
}

async function renderEditPage(
  published = false,
  fail: "save" | "publish" | false = false,
) {
  const { id, calls } = fakeApi(published, fail);
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [`/samples/${id}`] }),
  });
  const screen = await render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
  return { screen, calls };
}

describe("EditSamplePage", () => {
  it("should offer Save as draft and Save & Publish on a draft", async () => {
    const { screen } = await renderEditPage();
    await expect
      .element(screen.getByRole("button", { name: "Save as draft" }))
      .toBeEnabled();
    await expect
      .element(screen.getByRole("button", { name: "Save & Publish" }))
      .toBeEnabled();
  });

  it("should show the publication status as a read-only field", async () => {
    const { screen } = await renderEditPage();
    const field = screen.getByRole("switch", { name: "Published" });
    await expect.element(field).not.toBeChecked();
    await expect.element(field).toBeDisabled();
  });

  it("should not show an IGSN on a draft", async () => {
    const { screen } = await renderEditPage();
    await expect
      .element(screen.getByRole("heading", { name: "Edit sample" }))
      .toBeVisible();
    await expect
      .element(screen.getByText(IGSN, { exact: false }))
      .not.toBeInTheDocument();
  });

  it("should show the IGSN of a published sample under the title", async () => {
    const { screen } = await renderEditPage(true);
    await expect.element(screen.getByLabelText("IGSN")).toHaveTextContent(IGSN);
  });

  it("should offer only Publish updates on an already published sample", async () => {
    const { screen } = await renderEditPage(true);
    await expect
      .element(screen.getByRole("switch", { name: "Published" }))
      .toBeChecked();
    await expect
      .element(screen.getByRole("button", { name: "Publish updates" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Save & Publish" }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Save as draft" }))
      .not.toBeInTheDocument();
  });

  it("should link to the public page once published", async () => {
    const { screen } = await renderEditPage(true);
    await expect
      .element(screen.getByRole("link", { name: "View public page" }))
      .toHaveAttribute("href", `http://localhost:3000/samples/${IGSN}`);
  });

  it("should not link to the public page on a draft", async () => {
    const { screen } = await renderEditPage();
    await expect
      .element(screen.getByRole("button", { name: "Save & Publish" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("link", { name: "View public page" }))
      .not.toBeInTheDocument();
  });

  it("should save the edits, then publish, and warn it is irreversible", async () => {
    const { screen, calls } = await renderEditPage();
    await screen.getByLabelText(/name/i).fill("Grès de Fontainebleau");
    await screen.getByRole("button", { name: "Save & Publish" }).click();

    await expect.element(screen.getByText(/irreversible/i)).toBeVisible();

    await screen.getByRole("button", { name: "Confirm" }).click();

    // Publishing navigates back to the samples list.
    await expect
      .element(screen.getByRole("heading", { name: "Samples" }))
      .toBeVisible();
    // The edited name was saved before publishing.
    expect(calls).toEqual(["PUT Grès de Fontainebleau", "PUBLISH"]);
  });

  it("should show a toast after saving", async () => {
    const { screen } = await renderEditPage();
    await screen.getByLabelText(/name/i).fill("Grès de Fontainebleau");
    await screen.getByRole("button", { name: "Save as draft" }).click();

    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("Sample saved");
  });

  it("should show a toast after publishing", async () => {
    const { screen } = await renderEditPage();
    await screen.getByRole("button", { name: "Save & Publish" }).click();
    await screen.getByRole("button", { name: "Confirm" }).click();

    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("Sample published");
  });

  it("should show an error toast when saving fails", async () => {
    const { screen } = await renderEditPage(false, "save");
    await screen.getByLabelText(/name/i).fill("Grès de Fontainebleau");
    await screen.getByRole("button", { name: "Save as draft" }).click();

    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("Could not update the sample. Please try again.");
  });

  it("should show an error toast when publishing fails", async () => {
    const { screen } = await renderEditPage(false, "publish");
    await screen.getByRole("button", { name: "Save & Publish" }).click();
    await screen.getByRole("button", { name: "Confirm" }).click();

    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("Could not publish the sample. Please try again.");
  });

  it("should stay on the page after Save as draft", async () => {
    const { screen, calls } = await renderEditPage();
    await screen.getByLabelText(/name/i).fill("Grès de Fontainebleau");
    await screen.getByRole("button", { name: "Save as draft" }).click();

    await expect
      .element(screen.getByRole("heading", { name: "Edit sample" }))
      .toBeVisible();
    await vi.waitFor(() =>
      expect(calls).toEqual(["PUT Grès de Fontainebleau"]),
    );
  });
});
