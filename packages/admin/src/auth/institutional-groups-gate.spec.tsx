import { HttpResponse, http } from "msw";
import { vi } from "vitest";
import { page } from "vitest/browser";

import { fakeCurrentUser } from "../../test/fake-current-user.ts";
import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { InstitutionalGroupsGate } from "./institutional-groups-gate.tsx";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { access_token: "tok" } }),
}));

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
        institutionalLaboratory: "UMR7358",
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
    fakeCurrentUser(groups);

    const screen = await renderGate();

    await expect
      .element(page.getByRole("combobox", { name: /Laboratory/ }))
      .toBeVisible();
    expect(screen.getByText("Sample list").elements()).toHaveLength(0);
  });

  it("should show the app to a user with an organization and a laboratory", async () => {
    fakeCurrentUser({
      institutionalOrganization: "04vfs2w97",
      institutionalOsu: "OTELo",
      institutionalLaboratory: "UMR7358",
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
