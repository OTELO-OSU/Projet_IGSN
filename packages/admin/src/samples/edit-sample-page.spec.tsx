import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";
import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { HttpResponse, http } from "msw";
import { StrictMode } from "react";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { CALLER_GROUPS } from "../../test/caller-groups.ts";
import { FakeXhr } from "../../test/fake-xhr.ts";
import { worker } from "../../test/msw.ts";
import { routeTree } from "../routeTree.gen.ts";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    user: {
      access_token: "tok",
      profile: { identity_provider: "satosa", name: "Marie Dupont" },
    },
  }),
}));

const IGSN = "01K072TVWVFK5A1RRZ5MY4PPK9";
const LOCK_EXPIRY = "2026-07-01T10:15:00.000Z";

type LockHolder = {
  userId: string;
  name: string | null;
  firstname: string | null;
};

const ME: LockHolder = {
  userId: "3f2504e0-4f89-41d3-9a0c-0305e82c33aa",
  name: "Dupont",
  firstname: "Marie",
};

const PIERRE: LockHolder = {
  userId: "3f2504e0-4f89-41d3-9a0c-0305e82c33bb",
  name: "Martin",
  firstname: "Pierre",
};

const BASALT_TEAM = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000a1",
  name: "Basalt team",
};
const FOSSIL_TEAM = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000a2",
  name: "Fossil team",
};
const MANUAL_GROUPS = [BASALT_TEAM, FOSSIL_TEAM];

const ATTACHMENT: SampleAttachment = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c33cc",
  name: "data.csv",
  mediaType: "text/csv",
  description: null,
};

let callerStatus: "pending" | "accepted" = "accepted";
let callerUnknown = false;
let sampleFetched = false;

beforeEach(() => {
  callerStatus = "accepted";
  callerUnknown = false;
  sampleFetched = false;
});

const overLimitAttachments: SampleAttachment[] = Array.from(
  { length: 6 },
  (_, i) => ({
    id: `3f2504e0-4f89-41d3-9a0c-03050000000${i}`,
    name: `legacy-${i}.csv`,
    mediaType: "text/csv",
    description: null,
  }),
);

function fakeApi(
  published = false,
  material: string | null = "fossil",
  fail: "save" | "publish" | "stale" | "locked" | false = false,
  metamorphicFacies: string | null = null,
  texture: string | null = null,
  availability: "exists" | "no_longer_exists" = "exists",
  security: Record<string, unknown> | null = null,
  economic: Record<string, unknown> | null = null,
  attachments: SampleAttachment[] = [],
  role: UserSampleRole = "owner",
  holder: LockHolder | null = null,
) {
  let lockHolder = holder;
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
    manualGroups: [FOSSIL_TEAM],
    igsn: published ? IGSN : null,
    published,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
  };
  const calls: string[] = [];
  const lockCalls: string[] = [];
  worker.use(
    http.put("*/samples/:id/lock", () => {
      lockCalls.push("PUT");
      return lockHolder
        ? HttpResponse.json(
            {
              error: "Sample is being edited by another collaborator",
              reason: "locked",
              lock: { ...lockHolder, expiresAt: LOCK_EXPIRY },
            },
            { status: 409 },
          )
        : HttpResponse.json({
            lock: { ...ME, expiresAt: LOCK_EXPIRY },
          });
    }),
    http.delete("*/samples/:id/lock", () => {
      lockCalls.push("DELETE");
      return new HttpResponse(null, { status: 204 });
    }),
    http.get("*/admin/currentUser", async () => {
      if (callerUnknown) await new Promise(() => {});
      return HttpResponse.json({
        sub: "user-1",
        name: "Marie Dupont",
        orcid: null,
        status: callerStatus,
        superAdmin: false,
        ...CALLER_GROUPS,
      });
    }),
    http.put("*/samples/:id", async ({ request }) => {
      if (fail === "save") return new HttpResponse(null, { status: 500 });
      if (fail === "stale") {
        return HttpResponse.json(
          { error: "Sample changed since it was loaded", reason: "stale" },
          { status: 409 },
        );
      }
      if (fail === "locked") {
        return HttpResponse.json(
          {
            error: "Sample is being edited by another collaborator",
            reason: "locked",
            lock: { ...PIERRE, expiresAt: LOCK_EXPIRY },
          },
          { status: 409 },
        );
      }
      const { attachments: _attachments, ...body } = (await request.json()) as {
        attachments: unknown;
        name: string;
      };
      sample = { ...sample, ...body };
      calls.push(`PUT ${sample.name}`);
      return HttpResponse.json({
        data: sample,
        role,
        manualGroupOptions: MANUAL_GROUPS,
      });
    }),
    http.post("*/samples/:id/publish", () => {
      if (fail === "publish") return new HttpResponse(null, { status: 500 });
      sample = { ...sample, published: true, igsn: IGSN };
      calls.push("PUBLISH");
      return HttpResponse.json({
        data: sample,
        role,
        manualGroupOptions: MANUAL_GROUPS,
      });
    }),
    http.get("*/samples", () => {
      sampleFetched = true;
      return HttpResponse.json({
        data: [{ ...sample, owner: { name: "Dupont", firstname: "Marie" } }],
        meta: { total: 1 },
      });
    }),
    http.get("*/samples/:id", () => {
      sampleFetched = true;
      return HttpResponse.json({
        data: sample,
        role,
        manualGroupOptions: MANUAL_GROUPS,
      });
    }),
    http.delete(
      "*/samples/:id/attachments/:attachmentId",
      () => new HttpResponse(null, { status: 204 }),
    ),
  );
  return {
    id: sample.id,
    calls,
    lockCalls,
    releaseLock: () => {
      lockHolder = null;
    },
  };
}

async function renderEditPage(
  published = false,
  material: string | null = "fossil",
  fail: "save" | "publish" | "stale" | "locked" | false = false,
  metamorphicFacies: string | null = null,
  texture: string | null = null,
  availability: "exists" | "no_longer_exists" = "exists",
  security: Record<string, unknown> | null = null,
  economic: Record<string, unknown> | null = null,
  attachments: SampleAttachment[] = [],
  role: UserSampleRole = "owner",
  holder: LockHolder | null = null,
) {
  const { id, calls, lockCalls, releaseLock } = fakeApi(
    published,
    material,
    fail,
    metamorphicFacies,
    texture,
    availability,
    security,
    economic,
    attachments,
    role,
    holder,
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
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
  return {
    screen,
    calls,
    lockCalls,
    releaseLock,
    poll: () => queryClient.refetchQueries({ queryKey: ["sample-lock", id] }),
  };
}

const renderEditPageLockedBy = (holder: LockHolder, published = false) =>
  renderEditPage(
    published,
    "fossil",
    false,
    null,
    null,
    "exists",
    null,
    null,
    [ATTACHMENT],
    "owner",
    holder,
  );

const renderEditPageAsContributor = (published: boolean) =>
  renderEditPage(
    published,
    "fossil",
    false,
    null,
    null,
    "exists",
    null,
    null,
    [],
    "contributor",
  );

const renderEditPageAsEditor = (published: boolean) =>
  renderEditPage(
    published,
    "fossil",
    false,
    null,
    null,
    "exists",
    null,
    null,
    [],
    "editor",
  );

describe("EditSamplePage", () => {
  it("should not offer Save & Publish to a contributor on a draft", async () => {
    const { screen } = await renderEditPageAsContributor(false);

    await expect
      .element(screen.getByRole("button", { name: "Save as draft" }))
      .toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Save & Publish" }).elements(),
    ).toHaveLength(0);
  });

  it("should chip the attached manual groups but freeze them to a contributor", async () => {
    const { screen } = await renderEditPageAsContributor(false);

    await expect
      .element(screen.getByRole("button", { name: "Detach Fossil team" }))
      .toBeDisabled();
    await expect
      .element(
        screen.getByRole("combobox", { name: "Groups this sample belongs to" }),
      )
      .toBeDisabled();
    await expect
      .element(screen.getByText("You cannot change these groups."))
      .toBeVisible();
  });

  it.each<[string, () => ReturnType<typeof renderEditPage>, string[]]>([
    [
      "an editor on a draft",
      () => renderEditPageAsEditor(false),
      ["Save & Publish"],
    ],
    [
      "an editor on a published sample",
      () => renderEditPageAsEditor(true),
      ["Publish updates"],
    ],
    [
      "the owner on a draft",
      () => renderEditPage(),
      ["Save as draft", "Save & Publish"],
    ],
    [
      "the owner on a published sample",
      () => renderEditPage(true),
      ["Publish updates"],
    ],
  ])(
    "should offer the save actions to %s",
    async (_case, renderPage, buttons) => {
      const { screen } = await renderPage();

      for (const name of buttons) {
        await expect
          .element(screen.getByRole("button", { name }))
          .toBeEnabled();
      }
    },
  );

  it("should leave no focusable publish tooltip behind for a contributor on a blocked draft", async () => {
    const { screen } = await renderEditPage(
      false,
      null,
      false,
      null,
      null,
      "exists",
      null,
      null,
      [],
      "contributor",
    );

    await expect
      .element(screen.getByRole("button", { name: "Save as draft" }))
      .toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Save & Publish" }).elements(),
    ).toHaveLength(0);
    expect(document.querySelectorAll('span[tabindex="0"]')).toHaveLength(0);
  });

  it("should disable saving for a contributor on a published sample and explain why", async () => {
    const { screen } = await renderEditPageAsContributor(true);
    const save = screen.getByRole("button", { name: "Publish updates" });
    await expect.element(save).toBeDisabled();

    save.element().parentElement?.focus();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(
        /only the owner or an editor can update a published sample/i,
      );
  });

  it("should offer Share to the owner next to the title", async () => {
    const { screen } = await renderEditPage();

    await expect
      .element(screen.getByRole("button", { name: "Share" }))
      .toBeVisible();
  });

  it("should disable Save & Publish and explain in a tooltip when the sample has no material", async () => {
    const { screen } = await renderEditPage(false, null);
    const publish = screen.getByRole("button", { name: "Save & Publish" });
    await expect.element(publish).toBeDisabled();

    publish.element().parentElement?.focus();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(/set the material before publishing/i);
  });

  it("should disable Save & Publish for a pending account, complete sample or not", async () => {
    callerStatus = "pending";
    const { screen } = await renderEditPage();
    const publish = screen.getByRole("button", { name: "Save & Publish" });
    await expect.element(publish).toBeDisabled();

    publish.element().parentElement?.focus();
    const tooltip = screen.getByRole("tooltip");
    await expect
      .element(tooltip)
      .toHaveTextContent(/account is not yet activated/i);
    await expect.element(tooltip).not.toHaveTextContent(/before publishing/i);
    await expect
      .element(screen.getByRole("button", { name: "Save as draft" }))
      .toBeEnabled();
  });

  it("should drop the material reason once a pending account completes the cascade", async () => {
    callerStatus = "pending";
    const { screen } = await renderEditPage(false, "rock.igneous.volcanic");
    await screen.getByRole("tab", { name: "Sample type" }).click();
    await screen
      .getByRole("combobox", { name: "Volcanic *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Mafic", exact: true }).click();
    await screen
      .getByRole("combobox", { name: "Mafic *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Basalt", exact: true }).click();

    const publish = screen.getByRole("button", { name: "Save & Publish" });
    await expect.element(publish).toBeDisabled();
    publish.element().parentElement?.focus();
    const tooltip = screen.getByRole("tooltip");
    await expect
      .element(tooltip)
      .toHaveTextContent(/account is not yet activated/i);
    await expect.element(tooltip).not.toHaveTextContent(/material/i);
  });

  it("should offer no publishing until the account is known", async () => {
    callerUnknown = true;
    const { screen } = await renderEditPage();
    await vi.waitFor(() => expect(sampleFetched).toBe(true));
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    await expect.element(screen.getByText("Loading samples...")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Save & Publish" }).elements(),
    ).toHaveLength(0);
  });

  it("should list the missing fields and the account reason together", async () => {
    callerStatus = "pending";
    const { screen } = await renderEditPage(false, null);
    const publish = screen.getByRole("button", { name: "Save & Publish" });
    await expect.element(publish).toBeDisabled();

    publish.element().parentElement?.focus();
    const tooltip = screen.getByRole("tooltip");
    await expect
      .element(tooltip)
      .toHaveTextContent(/set the material before publishing/i);
    await expect
      .element(tooltip)
      .toHaveTextContent(/account is not yet activated/i);
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

    await screen.getByRole("tab", { name: "Physical description" }).click();
    const availability = screen.getByRole("combobox", {
      name: /availability/i,
    });
    await availability.click();
    await screen.getByRole("option", { name: "Exists", exact: true }).click();
    await expect.element(availability).not.toHaveTextContent("Exists");
    await expect.element(save).toBeDisabled();
    save.element().parentElement?.focus();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(
        "State whether the sample still exists before publishing.",
      );
    expect(calls).toEqual([]);

    await availability.click();
    await screen.getByRole("option", { name: "Exists", exact: true }).click();
    await expect.element(availability).toHaveTextContent("Exists");
    await expect.element(save).toBeEnabled();
    await save.click();
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0));
  });

  it("should refuse publishing a sample carrying more files than the limit", async () => {
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

    await save.click();

    await screen.getByRole("tab", { name: "Links" }).click();
    await screen.getByRole("button", { name: "Delete legacy-0.csv" }).click();
    await expect.element(publish).toBeEnabled();

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

    await expect.element(screen.getByText("data.csv")).toBeVisible();
    expect(FakeXhr.instances).toHaveLength(0);

    await screen.getByRole("button", { name: "Save as draft" }).click();

    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    expect(FakeXhr.instances[0]!.url).toContain("/attachments");
    expect(calls).toEqual([]);
    FakeXhr.instances[0]!.finish();
    await vi.waitFor(() =>
      expect(calls).toEqual(["PUT Basalte du Massif Central"]),
    );
  });

  describe("edit lock", () => {
    it("should name the holder and disable the form when another user holds the lock", async () => {
      const { screen } = await renderEditPageLockedBy(PIERRE, true);

      await expect
        .element(screen.getByRole("status"))
        .toHaveTextContent("Pierre Martin");
      await expect.element(screen.getByLabelText(/name/i)).toBeDisabled();
      const save = screen.getByRole("button", { name: "Publish updates" });
      await expect.element(save).toBeDisabled();
      save.element().parentElement?.focus();
      await expect
        .element(screen.getByRole("tooltip"))
        .toHaveTextContent("Pierre Martin");
    });

    it("should hold the form read-only when the lock holder has no name at all", async () => {
      const { screen } = await renderEditPageLockedBy({
        userId: "3f2504e0-4f89-41d3-9a0c-0305e82c33dd",
        name: null,
        firstname: null,
      });

      await expect
        .element(screen.getByRole("status"))
        .toHaveTextContent("Another collaborator is editing this sample");
      await expect.element(screen.getByLabelText(/name/i)).toBeDisabled();
    });

    it("should become editable when a later poll returns the lock as mine", async () => {
      const { screen, releaseLock, poll } =
        await renderEditPageLockedBy(PIERRE);
      await expect.element(screen.getByLabelText(/name/i)).toBeDisabled();

      releaseLock();
      await poll();

      await expect.element(screen.getByLabelText(/name/i)).toBeEnabled();
      await expect.element(screen.getByRole("status")).not.toBeInTheDocument();
    });

    it("should let no attachment be added, deleted or described while another user holds the lock", async () => {
      const { screen } = await renderEditPageLockedBy(PIERRE);
      await screen.getByRole("tab", { name: "Links" }).click();

      await expect
        .element(screen.getByRole("button", { name: "Download data.csv" }))
        .toBeEnabled();
      await expect
        .element(screen.getByRole("button", { name: "Delete data.csv" }))
        .toBeDisabled();
      await expect
        .element(screen.getByLabelText("Description of data.csv"))
        .toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Browse files" }).elements(),
      ).toHaveLength(0);
      expect(
        screen.getByRole("button", { name: "Add a link" }).elements(),
      ).toHaveLength(0);
    });

    it("should release the lock when the editor leaves the page", async () => {
      const { screen, lockCalls } = await renderEditPage();
      await expect
        .element(screen.getByRole("button", { name: "Cancel" }))
        .toBeEnabled();

      await screen.getByRole("button", { name: "Cancel" }).click();

      await expect
        .element(screen.getByRole("heading", { name: "Samples" }))
        .toBeVisible();
      await vi.waitFor(() => expect(lockCalls).toContain("DELETE"));
    });

    it("should not claim a lock for a caller who cannot update the sample", async () => {
      const { screen, lockCalls } = await renderEditPageAsContributor(true);

      await expect
        .element(screen.getByRole("button", { name: "Publish updates" }))
        .toBeDisabled();
      expect(lockCalls).toEqual([]);
    });

    it("should keep the age controls editable on an unlocked published sample", async () => {
      const { screen } = await renderEditPage(true);

      await screen.getByRole("tab", { name: "Physical description" }).click();
      await expect
        .element(screen.getByRole("switch", { name: "Record a numeric age" }))
        .toBeEnabled();
    });
  });

  it.each([
    ["locked", "Another collaborator is editing this sample"],
    ["stale", "This sample changed since you opened it"],
  ] as const)(
    "should keep the typed input and hold the form read-only when the save is refused as %s",
    async (reason, message) => {
      const { screen } = await renderEditPage(false, "fossil", reason);
      const name = screen.getByLabelText(/name/i);
      await name.fill("Grès de Fontainebleau");
      await screen.getByRole("button", { name: "Save as draft" }).click();

      await expect
        .element(screen.getByRole("alert"))
        .toHaveTextContent(message);
      await expect.element(name).toHaveValue("Grès de Fontainebleau");
      await expect.element(name).toBeDisabled();
    },
  );

  it("should still save the sample when a staged upload fails", async () => {
    FakeXhr.instances = [];
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const { screen, calls } = await renderEditPage();

    await screen.getByRole("tab", { name: "Links" }).click();
    await screen
      .getByLabelText("Browse files")
      .upload([new File(["col1\n1\n"], "data.csv", { type: "text/csv" })]);
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
