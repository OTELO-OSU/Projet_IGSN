import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";
import type { UserIdentity } from "@projet-igsn/domain/user/user-validator";

import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, delay, http } from "msw";
import { vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";

import { fakeSample } from "../../test/fake-sample.ts";
import { worker } from "../../test/msw.ts";
import { ShareSampleButton } from "./share-sample-button.tsx";

const { OWNER_EMAIL } = vi.hoisted(() => ({
  OWNER_EMAIL: "marie.dupont@univ-lorraine.fr",
}));

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    user: {
      access_token: "tok",
      profile: {
        name: "Marie Dupont",
        given_name: "Marie",
        family_name: "Dupont",
        email: OWNER_EMAIL,
      },
    },
  }),
}));

const SAMPLE_ID = fakeSample.id;

const curie: UserIdentity = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3401",
  email: "marie.curie@univ-lorraine.fr",
  name: "Curie",
  firstname: "Marie",
  orcid: null,
};
const dupont: UserIdentity = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3402",
  email: "pierre.dupont@univ-lorraine.fr",
  name: "Dupont",
  firstname: "Pierre",
  orcid: null,
};

const OWNER_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3400";

function fakeApi({
  role = "owner" as UserSampleRole,
  owner = {
    name: "Dupont",
    firstname: "Marie",
    email: OWNER_EMAIL,
  } as { name: string | null; firstname: string | null; email: string } | null,
  contributors = [] as UserIdentity[],
  directory = [] as UserIdentity[],
} = {}) {
  let listed = [...contributors];
  const calls: string[] = [];
  worker.use(
    http.get("*/samples/:id/collaborators", ({ request }) => {
      calls.push(`GET ${request.url}`);
      return HttpResponse.json({
        data: [
          ...(owner
            ? [{ id: OWNER_ID, orcid: null, ...owner, role: "owner" }]
            : []),
          ...listed.map((user) => ({ ...user, role: "contributor" })),
        ],
      });
    }),
    http.post("*/samples/:id/collaborators", async ({ request }) => {
      calls.push(`POST ${request.url}`);
      const { userId } = (await request.json()) as { userId: string };
      const picked = directory.find((user) => user.id === userId);
      if (picked && !listed.some((user) => user.id === picked.id)) {
        listed = [...listed, picked];
      }
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete(
      "*/samples/:id/collaborators/:userId",
      ({ request, params }) => {
        calls.push(`DELETE ${request.url}`);
        listed = listed.filter((user) => user.id !== params.userId);
        return new HttpResponse(null, { status: 204 });
      },
    ),
    http.get("*/admin/users/search", ({ request }) => {
      calls.push(`GET ${request.url}`);
      const search = (
        new URL(request.url).searchParams.get("search") ?? ""
      ).toLowerCase();
      return HttpResponse.json({
        data: directory.filter((user) =>
          user.name?.toLowerCase().includes(search),
        ),
      });
    }),
    http.get("*/samples/:id", () =>
      HttpResponse.json({ data: fakeSample, role }),
    ),
  );
  return { calls };
}

async function renderShareButton(options?: Parameters<typeof fakeApi>[0]) {
  const { calls } = fakeApi(options);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const screen = await render(
    <QueryClientProvider client={queryClient}>
      <ShareSampleButton sampleId={SAMPLE_ID} />
      <Toaster />
    </QueryClientProvider>,
  );
  const userSearches = () =>
    calls.filter((call) => call.includes("admin/users"));
  const filteredSearches = () =>
    userSearches().filter((call) => call.includes("search="));
  const contributorPosts = () =>
    calls.filter((call) => call.startsWith("POST"));
  const roleLoaded = () =>
    vi.waitFor(() =>
      expect(queryClient.getQueryState(["samples", SAMPLE_ID])?.status).toBe(
        "success",
      ),
    );
  return {
    screen,
    calls,
    userSearches,
    filteredSearches,
    contributorPosts,
    roleLoaded,
  };
}

type Screen = Awaited<ReturnType<typeof render>>;

const searchField = (screen: Screen) =>
  screen.getByRole("combobox", { name: "Search by name or email" });

const collaborators = (screen: Screen) =>
  screen.getByRole("dialog").getByRole("listitem");

const openDialog = (screen: Screen) =>
  screen.getByRole("button", { name: "Share" }).click();

const openPicker = async (screen: Screen) => {
  await openDialog(screen);
  await screen.getByRole("combobox", { name: "Search a colleague" }).click();
};

describe("ShareSampleButton", () => {
  it("should show the sample owner first", async () => {
    const { screen } = await renderShareButton();

    await openDialog(screen);

    await expect
      .element(screen.getByRole("heading", { name: "Owner" }))
      .toBeVisible();
    await expect
      .element(screen.getByText(`Marie Dupont ${OWNER_EMAIL}`))
      .toBeVisible();
  });

  it("should not load the collaborators before the dialog opens", async () => {
    const { screen, calls, roleLoaded } = await renderShareButton();

    await roleLoaded();

    await expect
      .element(screen.getByRole("button", { name: "Share" }))
      .toBeVisible();
    expect(calls.filter((call) => call.includes("collaborators"))).toEqual([]);
  });

  it("should name the sample's owner, not the signed-in caller", async () => {
    const { screen } = await renderShareButton({
      owner: {
        name: "Petit",
        firstname: "Jean",
        email: "jean.petit@univ-lorraine.fr",
      },
    });

    await openDialog(screen);

    await expect
      .element(screen.getByText("Jean Petit jean.petit@univ-lorraine.fr"))
      .toBeVisible();
    expect(screen.getByText(`Marie Dupont ${OWNER_EMAIL}`).elements()).toEqual(
      [],
    );
  });

  it("should show no owner section on a sample nobody owns", async () => {
    const { screen } = await renderShareButton({ owner: null });

    await openDialog(screen);

    await expect
      .element(screen.getByRole("dialog"))
      .toHaveTextContent("Share this sample");
    expect(screen.getByRole("heading", { name: "Owner" }).elements()).toEqual(
      [],
    );
  });

  it("should list the current collaborators under their own label", async () => {
    const { screen } = await renderShareButton({ contributors: [curie] });

    await openDialog(screen);

    await expect
      .element(screen.getByRole("dialog"))
      .toHaveTextContent("Share this sample");
    await expect
      .element(screen.getByRole("heading", { name: "Collaborators" }))
      .toBeVisible();
    await expect
      .element(screen.getByText("marie.curie@univ-lorraine.fr"))
      .toBeVisible();
  });

  it("should show an empty state when nobody collaborates yet", async () => {
    const { screen } = await renderShareButton();

    await openDialog(screen);

    await expect.element(screen.getByText("No collaborator yet")).toBeVisible();
  });

  it("should show a loading state while the collaborators load", async () => {
    const { screen } = await renderShareButton();
    worker.use(
      http.get("*/samples/:id/collaborators", () => delay("infinite")),
    );

    await openDialog(screen);

    await expect
      .element(screen.getByText("Loading collaborators..."))
      .toBeVisible();
  });

  it("should say so when the collaborators fail to load", async () => {
    const { screen } = await renderShareButton();
    worker.use(
      http.get(
        "*/samples/:id/collaborators",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    await openDialog(screen);

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("Could not load the collaborators.");
  });

  it("should offer no suggestion until the autocomplete is opened", async () => {
    const { screen } = await renderShareButton({ directory: [dupont] });

    await openDialog(screen);

    await expect
      .element(screen.getByRole("combobox", { name: "Search a colleague" }))
      .toBeVisible();
    expect(screen.getByRole("option").elements()).toEqual([]);
    expect(screen.getByRole("listbox").elements()).toEqual([]);
  });

  it("should add the picked colleague to the collaborator list", async () => {
    const { screen } = await renderShareButton({ directory: [dupont] });
    await openPicker(screen);

    await searchField(screen).fill("dup");
    await screen.getByRole("option", { name: /Dupont/ }).click();

    await expect
      .element(collaborators(screen))
      .toHaveTextContent("Pierre Dupont pierre.dupont@univ-lorraine.fr");
    await expect.element(screen.getByText("Collaborator added")).toBeVisible();
  });

  it("should leave the list unchanged when picking an already listed colleague", async () => {
    const { screen, contributorPosts } = await renderShareButton({
      contributors: [dupont],
      directory: [dupont],
    });
    await openPicker(screen);

    await searchField(screen).fill("dup");
    await screen.getByRole("option", { name: /Dupont/ }).click();
    await vi.waitFor(() => expect(contributorPosts()).toHaveLength(1));

    await expect
      .element(collaborators(screen))
      .toHaveTextContent("Pierre Dupont pierre.dupont@univ-lorraine.fr");
    expect(collaborators(screen).elements()).toHaveLength(1);
    expect(
      screen
        .getByText("Could not add the collaborator. Please try again.")
        .query(),
    ).toBeNull();
  });

  it("should list the colleagues on opening the autocomplete, before anything is typed", async () => {
    const { screen, filteredSearches } = await renderShareButton({
      directory: [dupont, curie],
    });

    await openPicker(screen);

    await expect
      .element(screen.getByRole("option", { name: /Dupont/ }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("option", { name: /Curie/ }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("listbox", { name: "Matching colleagues" }))
      .toBeInTheDocument();
    expect(filteredSearches()).toEqual([]);
  });

  it("should not filter on a term shorter than two characters", async () => {
    const { screen, filteredSearches } = await renderShareButton({
      directory: [dupont],
    });
    await openPicker(screen);

    await searchField(screen).fill("d");

    await expect
      .element(screen.getByRole("option", { name: /Dupont/ }))
      .toBeVisible();
    expect(screen.getByText("No colleague found").query()).toBeNull();
    expect(filteredSearches()).toEqual([]);
  });

  it("should say so when no colleague matches a typed term", async () => {
    const { screen } = await renderShareButton({ directory: [dupont] });
    await openPicker(screen);

    await searchField(screen).fill("zzz");

    await expect.element(screen.getByText("No colleague found")).toBeVisible();
  });

  it("should debounce the search instead of querying on each keystroke", async () => {
    const { screen, filteredSearches } = await renderShareButton({
      directory: [dupont],
    });
    await openPicker(screen);
    const field = searchField(screen);

    await field.fill("du");
    await field.fill("dup");
    await field.fill("dupo");

    await vi.waitFor(() =>
      expect(filteredSearches().at(-1)).toContain("search=dupo"),
    );
    expect(filteredSearches()).toHaveLength(1);
  });

  it("should let a keyboard user open the autocomplete and add a colleague", async () => {
    const { screen } = await renderShareButton({ directory: [dupont] });
    await openDialog(screen);

    screen
      .getByRole("combobox", { name: "Search a colleague" })
      .element()
      .focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .element(screen.getByRole("option", { name: /Dupont/ }))
      .toBeVisible();
    await userEvent.keyboard("{Enter}");

    await expect
      .element(collaborators(screen))
      .toHaveTextContent("Pierre Dupont");
  });

  it("should remove a contributor from the list", async () => {
    const { screen } = await renderShareButton({ contributors: [curie] });
    await openDialog(screen);

    await screen.getByRole("button", { name: "Remove Marie Curie" }).click();

    await expect.element(screen.getByText("No collaborator yet")).toBeVisible();
    await expect
      .element(screen.getByText("Collaborator removed"))
      .toBeVisible();
  });

  it("should keep the contributor listed when the removal fails", async () => {
    const { screen } = await renderShareButton({ contributors: [curie] });
    worker.use(
      http.delete(
        "*/samples/:id/collaborators/:userId",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    await openDialog(screen);

    await screen.getByRole("button", { name: "Remove Marie Curie" }).click();

    await expect
      .element(
        screen.getByText(
          "Could not remove the collaborator. Please try again.",
        ),
      )
      .toBeVisible();
    await expect
      .element(screen.getByText("marie.curie@univ-lorraine.fr"))
      .toBeVisible();
  });

  it("should render nothing for a contributor", async () => {
    const { screen, roleLoaded } = await renderShareButton({
      role: "contributor",
    });

    await roleLoaded();

    expect(screen.getByRole("button", { name: "Share" }).elements()).toEqual(
      [],
    );
  });
});
