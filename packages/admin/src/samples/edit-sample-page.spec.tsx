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

// In-memory API: GET returns the current sample, PUT saves it. Lets the page
// run its real save/refetch cycle without a backend.
function fakeApi(published = false) {
  let sample = {
    id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    name: "Basalte du Massif Central",
    nature: "thin_section",
    igsn: published ? IGSN : null,
    published,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
  };
  vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (init?.method === "PUT" && typeof init.body === "string") {
      sample = { ...sample, ...JSON.parse(init.body) };
    }
    if (init?.method === "POST" && url.endsWith("/publish")) {
      sample = { ...sample, published: true, igsn: IGSN };
    }
    const body = url.includes("samples?")
      ? { data: [sample], meta: { total: 1 } }
      : { data: sample };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  return sample.id;
}

async function renderEditPage(published = false) {
  const id = fakeApi(published);
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [`/samples/${id}`] }),
  });
  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}

describe("EditSamplePage", () => {
  it("should enable Publish when the form opens", async () => {
    const screen = await renderEditPage();
    await expect
      .element(screen.getByRole("button", { name: "Publish" }))
      .toBeEnabled();
  });

  it("should disable Publish while an edit is unsaved", async () => {
    const screen = await renderEditPage();
    await screen.getByLabelText(/name/i).fill("Grès de Fontainebleau");
    await expect
      .element(screen.getByRole("button", { name: "Publish" }))
      .toBeDisabled();
  });

  it("should show the publication status as a read-only field", async () => {
    const screen = await renderEditPage();
    const field = screen.getByRole("switch", { name: "Published" });
    await expect.element(field).not.toBeChecked();
    await expect.element(field).toBeDisabled();
  });

  it("should show an empty read-only IGSN until published", async () => {
    const screen = await renderEditPage();
    const field = screen.getByLabelText("IGSN");
    await expect.element(field).toHaveValue("");
    await expect.element(field).toHaveAttribute("readonly");
  });

  it("should show the IGSN of a published sample", async () => {
    const screen = await renderEditPage(true);
    await expect.element(screen.getByLabelText("IGSN")).toHaveValue(IGSN);
  });

  it("should not offer Publish on an already published sample", async () => {
    const screen = await renderEditPage(true);
    await expect
      .element(screen.getByRole("switch", { name: "Published" }))
      .toBeChecked();
    await expect
      .element(screen.getByRole("button", { name: "Publish" }))
      .not.toBeInTheDocument();
  });

  it("should warn that publishing is irreversible and publish on confirm", async () => {
    const screen = await renderEditPage();
    await screen.getByRole("button", { name: "Publish" }).click();

    await expect.element(screen.getByText(/irreversible/i)).toBeVisible();

    await screen.getByRole("button", { name: "Confirm" }).click();

    // Publishing navigates back to the samples list.
    await expect
      .element(screen.getByRole("heading", { name: "Samples" }))
      .toBeVisible();
  });

  it("should stay on the page and re-enable Publish after saving", async () => {
    const screen = await renderEditPage();
    await screen.getByLabelText(/name/i).fill("Grès de Fontainebleau");
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .element(screen.getByRole("heading", { name: "Edit sample" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Publish" }))
      .toBeEnabled();
  });
});
