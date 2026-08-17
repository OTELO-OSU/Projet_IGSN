import { HttpResponse, http } from "msw";
import { vi } from "vitest";

import { fakeCurrentUser } from "../../test/fake-current-user.ts";
import { worker } from "../../test/msw.ts";
import { renderRoute } from "../../test/render-route.tsx";

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

const GROUP = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000a1",
  name: "Basalt team",
};
const TAKEN_NAME = "Meteorite crew";

const curie = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3401",
  email: "marie.curie@univ-lorraine.fr",
  name: "Curie",
  firstname: "Marie",
  orcid: null,
  status: "accepted",
};
const dupont = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3402",
  email: "pierre.dupont@univ-lorraine.fr",
  name: "Dupont",
  firstname: "Pierre",
  orcid: null,
  status: "accepted",
};

const dupuis = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3403",
  email: "theo.dupuis@univ-lorraine.fr",
  name: "Dupuis",
  firstname: "Theo",
  orcid: null,
  status: "pending",
};

function fakeApi({ members = [curie], directory = [dupont] } = {}) {
  let group = { ...GROUP };
  let listed = [...members];
  const calls: string[] = [];
  fakeCurrentUser({ superAdmin: true });
  worker.use(
    http.get("*/admin/manual-groups/:id/members", () =>
      HttpResponse.json({ data: listed }),
    ),
    http.post("*/admin/manual-groups/:id/members", async ({ request }) => {
      const { userId } = (await request.json()) as { userId: string };
      const picked = directory.find((user) => user.id === userId);
      if (picked) listed = [...listed, picked];
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete("*/admin/manual-groups/:id/members/:userId", ({ params }) => {
      listed = listed.filter((user) => user.id !== params.userId);
      return new HttpResponse(null, { status: 204 });
    }),
    http.get("*/admin/manual-groups/:id", () =>
      HttpResponse.json({ data: group }),
    ),
    http.put("*/admin/manual-groups/:id", async ({ request }) => {
      const { name } = (await request.json()) as { name: string };
      if (name === TAKEN_NAME) return new HttpResponse(null, { status: 409 });
      group = { ...group, name };
      return HttpResponse.json({ data: group });
    }),
    http.delete("*/admin/manual-groups/:id", () => {
      calls.push("DELETE group");
      return new HttpResponse(null, { status: 204 });
    }),
    http.get("*/admin/manual-groups", () =>
      HttpResponse.json({ data: [], meta: { total: 0 } }),
    ),
    http.get("*/admin/users/search", ({ request }) => {
      const params = new URL(request.url).searchParams;
      const search = (params.get("search") ?? "").toLowerCase();
      const status = params.get("status");
      return HttpResponse.json({
        data: directory.filter(
          (user) =>
            user.name.toLowerCase().includes(search) &&
            (status === null || user.status === status),
        ),
      });
    }),
    http.get("*/admin/users/:id", ({ params }) => {
      const user = [...members, ...directory].find(
        ({ id }) => id === params.id,
      );
      return user
        ? HttpResponse.json({ data: { ...user, manualGroups: [] } })
        : new HttpResponse(null, { status: 404 });
    }),
  );
  return { calls };
}

const renderDetailPage = () => renderRoute(`/manual-groups/${GROUP.id}`);

describe("ManualGroupDetailPage", () => {
  it("should add the picked user to the members", async () => {
    fakeApi();

    const { screen } = await renderDetailPage();
    await screen.getByRole("button", { name: "Associate a user" }).click();
    await screen.getByRole("combobox", { name: "User" }).click();
    await screen
      .getByRole("combobox", { name: "Search by name or email" })
      .fill("dup");
    await screen.getByRole("option", { name: /Dupont/ }).click();
    await screen
      .getByRole("button", { name: "Associate", exact: true })
      .click();

    await expect
      .element(screen.getByRole("cell", { name: dupont.email }))
      .toBeVisible();
  });

  it("should not offer a pending user in the associate picker", async () => {
    fakeApi({ directory: [dupont, dupuis] });

    const { screen } = await renderDetailPage();
    await screen.getByRole("button", { name: "Associate a user" }).click();
    await screen.getByRole("combobox", { name: "User" }).click();
    await screen.getByPlaceholder("Search by name or email").fill("dup");

    await expect
      .element(screen.getByRole("option", { name: /Dupont/ }))
      .toBeVisible();
    expect(screen.getByRole("option", { name: /Dupuis/ }).elements()).toEqual(
      [],
    );
  });

  it("should open a member's account from its row", async () => {
    fakeApi();

    const { screen, router } = await renderDetailPage();
    await screen.getByRole("link", { name: "Marie Curie" }).click();

    await expect
      .poll(() => router.state.location.pathname)
      .toBe(`/users/${curie.id}`);
  });

  it("should detach a member once the detach is confirmed", async () => {
    fakeApi();

    const { screen } = await renderDetailPage();
    await expect
      .element(screen.getByRole("cell", { name: curie.email }))
      .toBeVisible();

    await screen.getByRole("button", { name: "Detach Marie Curie" }).click();
    await screen.getByRole("button", { name: "Detach", exact: true }).click();

    await expect
      .poll(() => screen.getByRole("cell", { name: curie.email }).elements())
      .toHaveLength(0);
  });

  it("should rename the group from the rename dialog", async () => {
    fakeApi();

    const { screen } = await renderDetailPage();
    await expect
      .element(screen.getByRole("heading", { level: 1 }))
      .toHaveTextContent("Basalt team");

    await screen.getByRole("button", { name: "Rename this group" }).click();
    await screen.getByLabelText("Group name").fill("Andesite lab");
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .element(screen.getByRole("heading", { level: 1 }))
      .toHaveTextContent("Andesite lab");
    await expect.poll(() => screen.getByRole("dialog").elements()).toEqual([]);
  });

  it("should show a field error when the new name is already used", async () => {
    fakeApi();

    const { screen } = await renderDetailPage();
    await screen.getByRole("button", { name: "Rename this group" }).click();
    await screen.getByLabelText("Group name").fill(TAKEN_NAME);
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("This name is already used");
  });

  it("should delete the group once the deletion is confirmed", async () => {
    const { calls } = fakeApi();

    const { screen, router } = await renderDetailPage();
    await screen.getByRole("button", { name: "Delete this group" }).click();
    await screen.getByLabelText("Type DELETE to confirm").fill("DELETE");
    await screen.getByRole("button", { name: "Delete", exact: true }).click();

    await expect
      .poll(() => router.state.location.pathname)
      .toBe("/manual-groups");
    expect(calls).toEqual(["DELETE group"]);
  });

  it("should explain a refused deletion when a published sample is attached", async () => {
    fakeApi();
    worker.use(
      http.delete(
        "*/admin/manual-groups/:id",
        () => new HttpResponse(null, { status: 409 }),
      ),
    );

    const { screen } = await renderDetailPage();
    await screen.getByRole("button", { name: "Delete this group" }).click();
    await screen.getByLabelText("Type DELETE to confirm").fill("DELETE");
    await screen.getByRole("button", { name: "Delete", exact: true }).click();

    await expect
      .element(screen.getByText(/published sample is attached/i))
      .toBeVisible();
  });

  it("should render an error when the group does not exist", async () => {
    fakeApi();
    worker.use(
      http.get(
        "*/admin/manual-groups/:id",
        () => new HttpResponse(null, { status: 404 }),
      ),
    );

    const { screen } = await renderDetailPage();

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("This manual group does not exist");
  });
});
