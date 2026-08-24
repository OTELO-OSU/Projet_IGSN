import { HttpResponse, http } from "msw";
import { vi } from "vitest";

import { fakeCurrentUser } from "../../test/fake-current-user.ts";
import { fakeSample } from "../../test/fake-sample.ts";
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

const MODERATED = [
  {
    ...fakeSample,
    id: "3f2504e0-4f89-41d3-9a0c-030500000001",
    name: "Sample of Jean",
    owner: { name: "Martin", firstname: "Jean", status: "accepted" },
  },
  {
    ...fakeSample,
    id: "3f2504e0-4f89-41d3-9a0c-030500000002",
    name: "Sample of Hugo",
    owner: { name: "Fournier", firstname: "Hugo", status: "pending" },
  },
];

function fakeApi() {
  worker.use(
    http.get("*/admin/samples/moderated", () =>
      HttpResponse.json({
        data: MODERATED,
        meta: { total: MODERATED.length },
      }),
    ),
    http.get("*/admin/samples", () =>
      HttpResponse.json({ data: [], meta: { total: 0 } }),
    ),
  );
}

describe("SampleModerationPage", () => {
  it("should list the moderated samples with each owner's account status", async () => {
    fakeCurrentUser({ managedLaboratories: ["UMR7359"] });
    fakeApi();

    const { screen } = await renderRoute("/samples/moderation");

    await expect
      .element(screen.getByRole("heading", { name: "Sample moderation" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("cell", { name: "Sample of Jean" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("cell", { name: /Jean Martin\s*Active/ }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("cell", { name: /Hugo Fournier\s*Pending/ }))
      .toBeVisible();
  });

  it("should send a plain researcher back to their own samples", async () => {
    fakeCurrentUser();
    fakeApi();

    const { screen } = await renderRoute("/samples/moderation");

    await expect
      .element(screen.getByRole("heading", { name: "My samples" }))
      .toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Sample moderation" }).elements(),
    ).toHaveLength(0);
  });
});
