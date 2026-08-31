import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";
import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { UserIdentity } from "@projet-igsn/domain/user/user-validator";

import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, delay, http } from "msw";
import { vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";

import { fakeCurrentUser } from "../../test/fake-current-user.ts";
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

type Collaborator = UserIdentity & { status: UserStatus };

const curie: Collaborator = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3401",
  email: "marie.curie@univ-lorraine.fr",
  name: "Curie",
  firstname: "Marie",
  orcid: null,
  status: "accepted",
};
const dupont: Collaborator = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3402",
  email: "pierre.dupont@univ-lorraine.fr",
  name: "Dupont",
  firstname: "Pierre",
  orcid: null,
  status: "accepted",
};

const OWNER_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3400";

type Owner = Omit<Collaborator, "id" | "orcid">;

const OWNER: Owner = {
  name: "Dupont",
  firstname: "Marie",
  email: OWNER_EMAIL,
  status: "accepted",
};

function fakeApi({
  role = "owner" as UserSampleRole,
  owner = OWNER as Owner | null,
  contributors = [] as Collaborator[],
  editors = [] as Collaborator[],
  directory = [] as Collaborator[],
} = {}) {
  let listed = [
    ...editors.map((user) => ({ ...user, role: "editor" })),
    ...contributors.map((user) => ({ ...user, role: "contributor" })),
  ];
  const calls: string[] = [];
  const invites: { userId: string; role: string }[] = [];
  fakeCurrentUser({ email: OWNER_EMAIL });
  worker.use(
    http.get("*/samples/:id/collaborators", ({ request }) => {
      calls.push(`GET ${request.url}`);
      return HttpResponse.json({
        data: [
          ...(owner
            ? [{ id: OWNER_ID, orcid: null, ...owner, role: "owner" }]
            : []),
          ...listed,
        ],
      });
    }),
    http.post("*/samples/:id/collaborators", async ({ request }) => {
      calls.push(`POST ${request.url}`);
      const invite = (await request.json()) as { userId: string; role: string };
      invites.push(invite);
      const picked = directory.find((user) => user.id === invite.userId);
      if (picked && !listed.some((user) => user.id === picked.id)) {
        listed = [...listed, { ...picked, role: invite.role }];
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
      const url = new URL(request.url);
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      const excluded = url.searchParams.get("excludeCollaboratorsOf")
        ? new Set([OWNER_ID, ...listed.map((user) => user.id)])
        : new Set<string>();
      return HttpResponse.json({
        data: directory.filter(
          (user) =>
            !excluded.has(user.id) && user.name?.toLowerCase().includes(search),
        ),
      });
    }),
    http.get("*/samples/:id", () =>
      HttpResponse.json({ data: fakeSample, role, managed: false }),
    ),
  );
  return { calls, invites };
}

async function renderShareButton(options?: Parameters<typeof fakeApi>[0]) {
  const { calls, invites } = fakeApi(options);
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
  const roleLoaded = () =>
    vi.waitFor(() =>
      expect(queryClient.getQueryState(["samples", SAMPLE_ID])?.status).toBe(
        "success",
      ),
    );
  return {
    screen,
    calls,
    invites,
    userSearches,
    filteredSearches,
    roleLoaded,
  };
}

type Screen = Awaited<ReturnType<typeof render>>;

const searchField = (screen: Screen) =>
  screen.getByRole("combobox", { name: "Search by name or email" });

const collaborators = (screen: Screen) =>
  screen
    .getByRole("dialog", { name: "Share this sample" })
    .getByRole("listitem");

const collaboratorRows = (screen: Screen) =>
  collaborators(screen)
    .elements()
    .map((row) => row.textContent);

const expectCollaborators = (screen: Screen, expected: unknown[]) =>
  vi.waitFor(() => expect(collaboratorRows(screen)).toEqual(expected));

const removeCollaborator = async (screen: Screen, name: string) => {
  await screen.getByRole("button", { name: `Remove ${name}` }).click();
  await screen.getByRole("button", { name: "Confirm" }).click();
};

const openDialog = (screen: Screen) =>
  screen.getByRole("button", { name: "Share" }).click();

const emailField = (screen: Screen) =>
  screen.getByRole("combobox", { name: "Email" });

const openInvite = (screen: Screen) =>
  screen.getByRole("button", { name: "Invite" }).click();

const openInviteDialog = async (screen: Screen) => {
  await openDialog(screen);
  await openInvite(screen);
};

const openPicker = async (screen: Screen) => {
  await openInviteDialog(screen);
  await emailField(screen).click();
};

const invite = (screen: Screen) =>
  screen.getByRole("button", { name: "Send invitation" }).click();

const pickAndInvite = async (screen: Screen, name: RegExp) => {
  await screen.getByRole("option", { name }).click();
  await invite(screen);
};

describe("ShareSampleButton", () => {
  it("should not offer to remove the owner", async () => {
    const { screen } = await renderShareButton();

    await openDialog(screen);

    await expect.element(screen.getByText(OWNER_EMAIL)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Remove Marie Dupont" }).elements(),
    ).toEqual([]);
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
        status: "accepted",
      },
    });

    await openDialog(screen);

    await expect
      .element(screen.getByText("jean.petit@univ-lorraine.fr"))
      .toBeVisible();
    expect(screen.getByText(OWNER_EMAIL).elements()).toEqual([]);
  });

  it("should list the current collaborators under their own label", async () => {
    const { screen } = await renderShareButton({ contributors: [curie] });

    await openDialog(screen);

    await expect
      .element(screen.getByRole("dialog"))
      .toHaveTextContent("Share this sample");
    await expect
      .element(screen.getByRole("list", { name: "Collaborators" }))
      .toBeVisible();
    await expect
      .element(screen.getByText("marie.curie@univ-lorraine.fr"))
      .toBeVisible();
  });

  it("should show an empty state when nobody works on the sample yet", async () => {
    const { screen } = await renderShareButton({ owner: null });

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

    await openInviteDialog(screen);

    await expect.element(emailField(screen)).toBeVisible();
    expect(screen.getByRole("option").elements()).toEqual([]);
    expect(screen.getByRole("listbox").elements()).toEqual([]);
  });

  it("should add the picked colleague as contributor, the default role", async () => {
    const { screen, invites } = await renderShareButton({
      directory: [dupont],
    });
    await openPicker(screen);

    await searchField(screen).fill("dup");
    await pickAndInvite(screen, /Dupont/);

    await expectCollaborators(screen, [
      expect.stringContaining("Marie Dupont"),
      expect.stringContaining(
        "Pierre Dupontpierre.dupont@univ-lorraine.frContributor",
      ),
    ]);
    await expect.element(screen.getByText("Collaborator added")).toBeVisible();
    expect(invites).toEqual([{ userId: dupont.id, role: "contributor" }]);
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
    await openInviteDialog(screen);

    emailField(screen).element().focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .element(screen.getByRole("option", { name: /Dupont/ }))
      .toBeVisible();
    await userEvent.keyboard("{Enter}");
    await invite(screen);

    await expect
      .element(screen.getByText("pierre.dupont@univ-lorraine.fr"))
      .toBeVisible();
  });

  it("should not offer an existing collaborator as a suggestion", async () => {
    const { screen } = await renderShareButton({
      contributors: [dupont],
      directory: [dupont, curie],
    });

    await openPicker(screen);

    await expect
      .element(screen.getByRole("option", { name: /Curie/ }))
      .toBeVisible();
    expect(screen.getByRole("option", { name: /Dupont/ }).elements()).toEqual(
      [],
    );
  });

  it("should stop offering a colleague once added", async () => {
    const { screen, userSearches } = await renderShareButton({
      directory: [dupont],
    });
    await openPicker(screen);
    await pickAndInvite(screen, /Dupont/);
    await expect
      .element(screen.getByText("pierre.dupont@univ-lorraine.fr"))
      .toBeVisible();

    const searchesBeforeReopen = userSearches().length;
    await openInvite(screen);
    await emailField(screen).click();

    await vi.waitFor(() => {
      expect(userSearches().length).toBeGreaterThan(searchesBeforeReopen);
      expect(screen.getByRole("option").elements()).toEqual([]);
    });
  });

  it("should remove a contributor from the list once the removal is confirmed", async () => {
    const { screen } = await renderShareButton({ contributors: [curie] });
    await openDialog(screen);

    await removeCollaborator(screen, "Marie Curie");

    await expectCollaborators(screen, [
      expect.stringContaining("Marie Dupont"),
    ]);
    await expect
      .element(screen.getByText("Collaborator removed"))
      .toBeVisible();
  });

  it("should keep the contributor when the removal is cancelled", async () => {
    const { screen, calls } = await renderShareButton({
      contributors: [curie],
    });
    await openDialog(screen);

    await screen.getByRole("button", { name: "Remove Marie Curie" }).click();
    await expect
      .element(
        screen.getByRole("dialog", { name: "Remove this collaborator?" }),
      )
      .toHaveTextContent("Marie Curie will no longer be able to edit");
    await screen.getByRole("button", { name: "Cancel" }).click();

    await expect
      .element(screen.getByText("marie.curie@univ-lorraine.fr"))
      .toBeVisible();
    expect(calls.filter((call) => call.startsWith("DELETE"))).toEqual([]);
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

    await removeCollaborator(screen, "Marie Curie");

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

  it("should invite the picked colleague with the role chosen after the pick", async () => {
    const { screen, invites } = await renderShareButton({
      directory: [dupont],
    });
    await openPicker(screen);

    await screen.getByRole("option", { name: /Dupont/ }).click();
    await screen.getByRole("radio", { name: /Editor/ }).click();
    await invite(screen);

    await vi.waitFor(() =>
      expect(invites).toEqual([{ userId: dupont.id, role: "editor" }]),
    );
  });

  it("should invite nobody until the invitation is submitted", async () => {
    const { screen, invites } = await renderShareButton({
      directory: [dupont],
    });
    await openInviteDialog(screen);
    await expect
      .element(screen.getByRole("button", { name: "Send invitation" }))
      .toBeDisabled();

    await emailField(screen).click();
    await screen.getByRole("option", { name: /Dupont/ }).click();

    await expect.element(emailField(screen)).toHaveTextContent("Pierre Dupont");
    expect(invites).toEqual([]);
  });

  it("should state the role of each collaborator", async () => {
    const { screen } = await renderShareButton({
      contributors: [curie],
      editors: [dupont],
    });

    await openDialog(screen);

    await expectCollaborators(screen, [
      expect.stringMatching(/Marie Dupont.*Owner \/ Editor/),
      expect.stringMatching(/Pierre Dupont.*Editor/),
      expect.stringMatching(/Marie Curie.*Contributor/),
    ]);
  });

  it.each([
    ["pending", "Pending"],
    ["rejected", "Disabled"],
  ] as const)("should label a %s collaborator as %s", async (status, label) => {
    const { screen } = await renderShareButton({
      contributors: [{ ...curie, status }],
    });

    await openDialog(screen);

    await expectCollaborators(screen, [
      expect.stringContaining("Marie Dupont"),
      expect.stringMatching(new RegExp(`Marie Curie.*${label}.*Contributor`)),
    ]);
  });

  it("should not label the signed-in user's own row, since their own status is not news to them", async () => {
    const { screen } = await renderShareButton({
      owner: { ...OWNER, status: "pending" },
      contributors: [{ ...curie, status: "pending" }],
    });

    await openDialog(screen);

    await expectCollaborators(screen, [
      expect.not.stringContaining("Pending"),
      expect.stringContaining("Pending"),
    ]);
  });

  it.each(["editor", "contributor"] as const)(
    "should show the collaborator list to the %s, with no way to remove anyone",
    async (role) => {
      const { screen } = await renderShareButton({
        role,
        contributors: [curie],
      });

      await openDialog(screen);

      await expect
        .element(screen.getByText("marie.curie@univ-lorraine.fr"))
        .toBeVisible();
      expect(
        screen.getByRole("button", { name: /^Remove/ }).elements(),
      ).toEqual([]);
    },
  );

  it("should let a contributor invite a contributor, never an editor", async () => {
    const { screen, invites } = await renderShareButton({
      role: "contributor",
      directory: [dupont],
    });
    await openPicker(screen);

    expect(screen.getByRole("radio", { name: /Editor/ }).elements()).toEqual(
      [],
    );
    await pickAndInvite(screen, /Dupont/);

    await vi.waitFor(() =>
      expect(invites).toEqual([{ userId: dupont.id, role: "contributor" }]),
    );
  });
});
