import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { FakeXhr } from "../../test/fake-xhr.ts";
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

// One file over the default limit of 5, like a sample imported before the cap.
const overLimitAttachments: SampleAttachment[] = Array.from(
  { length: 6 },
  (_, i) => ({
    id: `3f2504e0-4f89-41d3-9a0c-03050000000${i}`,
    name: `legacy-${i}.csv`,
    mediaType: "text/csv",
    description: null,
  }),
);

// In-memory API: GET returns the current sample, PUT saves it, POST /publish
// publishes it. Records write calls so tests can assert the save-then-publish
// order. Lets the page run its real save/refetch cycle without a backend.
// Default type and material are leaves so Save & Publish starts enabled (see
// samplePublishBlockers).
function fakeApi(
  published = false,
  material: string | null = "fossil",
  fail: "save" | "publish" | false = false,
  metamorphicFacies: string | null = null,
  texture: string | null = null,
  availability: "exists" | "no_longer_exists" = "exists",
  security: Record<string, unknown> | null = null,
  economic: Record<string, unknown> | null = null,
  attachments: SampleAttachment[] = [],
) {
  let sample = {
    id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    attachments,
    name: "Basalte du Massif Central",
    nature: "thin_section",
    type: "dredge",
    material,
    texture,
    metamorphicFacies,
    collectionMethod: null,
    collectionMethodDescription: null,
    specificName: "MC-2026-007",
    location: { position: { type: "point", longitude: 3, latitude: 45 } },
    description: { collectionDate: { start: "2026-01-01", end: "2026-01-01" } },
    condition: null,
    security,
    // Complete (historical branch) so Save & Publish starts enabled, like the
    // leaf type/material above.
    scientificContext: {
      provenanceStatus: "historical_specimen",
      collectionCurator: "Georges Cuvier",
      collectionOrigin: "scientific_expedition",
    },
    availability,
    publicationYear: published ? 2026 : null,
    economicInterest: null,
    economicInterestElements: [],
    economicResourceTypePrecision: null,
    economicDepositName: null,
    economicDepositDescription: null,
    ...economic,
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
      // The attachments payload carries {id, description} entries, not the
      // full attachments; drop them to keep the fake sample parseable.
      const { attachments: _attachments, ...body } = JSON.parse(init.body);
      sample = { ...sample, ...body };
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
  material: string | null = "fossil",
  fail: "save" | "publish" | false = false,
  metamorphicFacies: string | null = null,
  texture: string | null = null,
  availability: "exists" | "no_longer_exists" = "exists",
  security: Record<string, unknown> | null = null,
  economic: Record<string, unknown> | null = null,
  attachments: SampleAttachment[] = [],
) {
  const { id, calls } = fakeApi(
    published,
    material,
    fail,
    metamorphicFacies,
    texture,
    availability,
    security,
    economic,
    attachments,
  );
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

  it("should disable Save & Publish and explain in a tooltip when the sample has no material", async () => {
    const { screen } = await renderEditPage(false, null);
    const publish = screen.getByRole("button", { name: "Save & Publish" });
    await expect.element(publish).toBeDisabled();

    // The disabled button is not focusable; its tooltip trigger (the wrapping
    // span) reveals the reason on focus, the way a keyboard user would find it.
    publish.element().parentElement?.focus();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(/set the material before publishing/i);
  });

  it("should render the material cascade prefilled on the Sample type tab", async () => {
    const { screen } = await renderEditPage(false, "rock.igneous");
    await screen.getByRole("tab", { name: "Sample type" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Rock *", exact: true }))
      .toHaveTextContent("Igneous");
  });

  it("should render the metamorphic facies prefilled on the Sample type tab", async () => {
    const { screen } = await renderEditPage(
      false,
      "rock.metamorphic.strongly_metamorphosed.gneiss",
      false,
      "amphibolite",
    );
    await screen.getByRole("tab", { name: "Sample type" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Metamorphic facies *" }))
      .toHaveTextContent("Amphibolite facies");
  });

  it("should render the igneous texture prefilled on the Sample type tab", async () => {
    const { screen } = await renderEditPage(
      false,
      "rock.igneous.plutonic",
      false,
      null,
      "phaneritic",
    );
    await screen.getByRole("tab", { name: "Sample type" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Texture" }))
      .toHaveTextContent("Phaneritic");
  });

  it("should prefill availability from the saved sample instead of resetting it to Exists", async () => {
    const { screen } = await renderEditPage(
      false,
      "fossil",
      false,
      null,
      null,
      "no_longer_exists",
    );
    await screen.getByRole("tab", { name: "Physical description" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: /availability/i }))
      .toHaveTextContent("No longer exists");
  });

  it("should prefill a declared security hazard from the saved sample", async () => {
    const { screen } = await renderEditPage(
      false,
      "fossil",
      false,
      null,
      null,
      "exists",
      { radioactivity: true, radioactivityExplanation: "3.2 kBq alpha" },
    );
    await screen.getByRole("tab", { name: "Physical description" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Radioactivity" }))
      .toHaveTextContent("Yes");
    await expect
      .element(screen.getByLabelText("Radioactivity explanation"))
      .toHaveValue("3.2 kBq alpha");
  });

  it("should prefill the economic interest and deposit name from the saved sample", async () => {
    const { screen } = await renderEditPage(
      false,
      "fossil",
      false,
      null,
      null,
      "exists",
      null,
      { economicInterest: "yes", economicDepositName: "Grande Mine" },
    );
    await screen.getByRole("tab", { name: "Physical description" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Economic interest" }))
      .toHaveTextContent("Yes");
    await expect
      .element(screen.getByLabelText("Deposit name"))
      .toHaveValue("Grande Mine");
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

  it("should refuse Publish updates that would make the sample unpublishable", async () => {
    const { screen, calls } = await renderEditPage(true);
    const save = screen.getByRole("button", { name: "Publish updates" });

    // Clearing the collection date strips a publish requirement: the button
    // disables and its tooltip explains, like the first publish.
    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByLabelText("Date *", { exact: true }).fill("");
    await expect.element(save).toBeDisabled();
    save.element().parentElement?.focus();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent("Set the collection date before publishing.");
    expect(calls).toEqual([]);

    await screen.getByLabelText("Date *", { exact: true }).fill("2026-01-02");
    await expect.element(save).toBeEnabled();
    await save.click();
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0));
  });

  it("should refuse publishing a sample carrying more files than the limit", async () => {
    // A legacy sample above the cap: nothing was grandfathered, so it must
    // shed a file before it can be published again.
    const { screen, calls } = await renderEditPage(
      false,
      "fossil",
      false,
      null,
      null,
      "exists",
      null,
      null,
      overLimitAttachments,
    );
    const publish = screen.getByRole("button", { name: "Save & Publish" });
    const save = screen.getByRole("button", { name: "Save as draft" });

    await expect.element(publish).toBeDisabled();
    publish.element().parentElement?.focus();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(/at most 5 attached files/i);

    // The draft save stays live but noops, like any invalid field: the red
    // file count carries the error.
    await save.click();

    await screen.getByRole("tab", { name: "Links" }).click();
    await screen.getByRole("button", { name: "Delete legacy-0.csv" }).click();
    await expect.element(publish).toBeEnabled();

    // The noop sent nothing; back under the limit the same button saves.
    await save.click();
    await vi.waitFor(() =>
      expect(calls).toEqual(["PUT Basalte du Massif Central"]),
    );
  });

  it("should not mention the attachment limit on a sample at the limit", async () => {
    const { screen } = await renderEditPage(
      false,
      "fossil",
      false,
      null,
      null,
      "exists",
      null,
      null,
      overLimitAttachments.slice(1),
    );

    await expect
      .element(screen.getByRole("button", { name: "Save & Publish" }))
      .toBeEnabled();
  });

  it("should offer only Publish updates on an already published sample", async () => {
    const { screen } = await renderEditPage(true);
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
    const { screen } = await renderEditPage(false, "fossil", "save");
    await screen.getByLabelText(/name/i).fill("Grès de Fontainebleau");
    await screen.getByRole("button", { name: "Save as draft" }).click();

    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("Could not update the sample. Please try again.");
  });

  it("should show an error toast when publishing fails", async () => {
    const { screen } = await renderEditPage(false, "fossil", "publish");
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

  it("should upload files staged in the Links tab only when saving, before the save", async () => {
    FakeXhr.instances = [];
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const { screen, calls } = await renderEditPage();

    await screen.getByRole("tab", { name: "Links" }).click();
    await screen
      .getByLabelText("Browse files")
      .upload([new File(["col1\n1\n"], "data.csv", { type: "text/csv" })]);

    // Staged, listed, but nothing sent yet: cancelling now would leave the
    // server untouched.
    await expect.element(screen.getByText("data.csv")).toBeVisible();
    expect(FakeXhr.instances).toHaveLength(0);

    await screen.getByRole("button", { name: "Save as draft" }).click();

    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    expect(FakeXhr.instances[0]!.url).toContain("/attachments");
    // The save waits for the uploads to settle.
    expect(calls).toEqual([]);
    FakeXhr.instances[0]!.finish();
    await vi.waitFor(() =>
      expect(calls).toEqual(["PUT Basalte du Massif Central"]),
    );
  });

  it("should still save the sample when a staged upload fails", async () => {
    FakeXhr.instances = [];
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const { screen, calls } = await renderEditPage();

    await screen.getByRole("tab", { name: "Links" }).click();
    await screen
      .getByLabelText("Browse files")
      .upload([new File(["col1\n1\n"], "data.csv", { type: "text/csv" })]);
    // The upload dialog shows whatever tab is active when submitting.
    await screen.getByRole("tab", { name: "Sample classification" }).click();
    await screen.getByRole("button", { name: "Save as draft" }).click();

    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    FakeXhr.instances[0]!.finish(500);

    await expect
      .element(screen.getByRole("dialog"))
      .toHaveTextContent("Could not upload.");
    await vi.waitFor(() =>
      expect(calls).toEqual(["PUT Basalte du Massif Central"]),
    );
  });
});
