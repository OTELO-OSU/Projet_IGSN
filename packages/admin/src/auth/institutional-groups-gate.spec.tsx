import { HttpResponse, http } from "msw";
import { vi } from "vitest";
import { page } from "vitest/browser";

import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { InstitutionalGroupsGate } from "./institutional-groups-gate.tsx";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { access_token: "tok" } }),
}));

const fakeIdentity = (groups: Record<string, string | null>) =>
  worker.use(
    http.get("*/admin/currentUser", () =>
      HttpResponse.json({
        sub: "s",
        orcid: null,
        status: "accepted",
        superAdmin: false,
        ...groups,
      }),
    ),
  );

const renderGate = () =>
  render(
    <InstitutionalGroupsGate onSignOut={vi.fn()}>
      <p>Sample list</p>
    </InstitutionalGroupsGate>,
  );

describe("InstitutionalGroupsGate", () => {
  it.each([
    {
      rule: "a laboratory but no organization",
      groups: {
        institutionalOrganization: null,
        institutionalOsu: null,
        institutionalLaboratory: "CRPG",
      },
    },
    {
      rule: "an organization but no laboratory",
      groups: {
        institutionalOrganization: "04vfs2w97",
        institutionalOsu: "OTELo",
        institutionalLaboratory: null,
      },
    },
  ])("should hold a user with $rule on the form", async ({ groups }) => {
    fakeIdentity(groups);

    const screen = await renderGate();

    await expect
      .element(page.getByRole("combobox", { name: /Laboratory/ }))
      .toBeVisible();
    expect(screen.getByText("Sample list").elements()).toHaveLength(0);
  });

  it("should show the app to a user with an organization and a laboratory", async () => {
    fakeIdentity({
      institutionalOrganization: "04vfs2w97",
      institutionalOsu: "OTELo",
      institutionalLaboratory: "CRPG",
    });

    const screen = await renderGate();

    await expect.element(screen.getByText("Sample list")).toBeVisible();
  });

  it("should show the app when the identity call fails", async () => {
    worker.use(
      http.get(
        "*/admin/currentUser",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const screen = await renderGate();

    await expect.element(screen.getByText("Sample list")).toBeVisible();
  });
});
