import { HttpResponse, http } from "msw";

import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { IdentityGate } from "./identity-gate.tsx";

const onSignOut = vi.fn();

const fakeIdentity = (status: number) =>
  worker.use(
    http.get("*/admin/currentUser", () =>
      status === 200
        ? HttpResponse.json({
            sub: "s",
            orcid: null,
            status: "accepted",
            superAdmin: false,
          })
        : new HttpResponse(null, { status }),
    ),
  );

const renderGate = (isOrcid: boolean) =>
  render(
    <IdentityGate isOrcid={isOrcid} onSignOut={onSignOut}>
      <p>Sample list</p>
    </IdentityGate>,
  );

beforeEach(() => onSignOut.mockReset());

describe("IdentityGate", () => {
  it.each([true, false])(
    "should show the app to an accepted user (orcid %s)",
    async (isOrcid) => {
      fakeIdentity(200);

      const screen = await renderGate(isOrcid);

      await expect.element(screen.getByText("Sample list")).toBeVisible();
    },
  );

  it.each([
    [false, /do not have access/i],
    [true, /not linked to an account/i],
  ])(
    "should deny a forbidden identity and offer signing out (orcid %s)",
    async (isOrcid, message) => {
      fakeIdentity(403);

      const screen = await renderGate(isOrcid);

      await expect
        .element(screen.getByRole("alert"))
        .toHaveTextContent(message);
      expect(screen.getByText("Sample list").elements()).toHaveLength(0);
      await screen.getByRole("button", { name: "Sign out" }).click();
      expect(onSignOut).toHaveBeenCalledOnce();
    },
  );

  it("should show the app when the identity call fails otherwise", async () => {
    fakeIdentity(500);

    const screen = await renderGate(false);

    await expect.element(screen.getByText("Sample list")).toBeVisible();
  });

  it("should block an ORCID session when the identity call fails otherwise", async () => {
    fakeIdentity(500);

    const screen = await renderGate(true);

    await expect.element(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByText("Sample list").elements()).toHaveLength(0);
  });
});
