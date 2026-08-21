import { HttpResponse, http } from "msw";

import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { IdentityGate } from "./identity-gate.tsx";

const onSignOut = vi.fn();

const fakeIdentity = (status: number, body?: BodyInit) =>
  worker.use(
    http.get("*/admin/currentUser", () =>
      status === 200
        ? HttpResponse.json({
            sub: "s",
            orcid: null,
            status: "accepted",
            superAdmin: false,
            managedLaboratories: [],
          })
        : new HttpResponse(body ?? null, { status }),
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

  it("should name eduGAIN and ORCID when the api refuses the identity provider", async () => {
    fakeIdentity(
      403,
      JSON.stringify({
        error: "Forbidden",
        reason: "unsupported_identity_provider",
      }),
    );

    const screen = await renderGate(false);

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent(/eduGAIN.*ORCID iD/i);
    await expect
      .element(screen.getByRole("alert"))
      .not.toHaveTextContent(/do not have access/i);
    await expect
      .element(screen.getByRole("button", { name: "Sign out" }))
      .toBeVisible();
  });

  it("should keep the generic denial when the forbidden body is not JSON", async () => {
    fakeIdentity(403, "Forbidden");

    const screen = await renderGate(false);

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent(/do not have access/i);
  });

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
