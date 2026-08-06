import { HttpResponse, http } from "msw";

import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { AccountGate } from "./account-gate.tsx";

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

const renderGate = () =>
  render(
    <AccountGate onSignOut={onSignOut}>
      <p>Sample list</p>
    </AccountGate>,
  );

beforeEach(() => onSignOut.mockReset());

describe("AccountGate", () => {
  it("should show the app to an accepted user", async () => {
    fakeIdentity(200);

    const screen = await renderGate();

    await expect.element(screen.getByText("Sample list")).toBeVisible();
  });

  it("should deny a rejected user and offer signing out", async () => {
    fakeIdentity(403);

    const screen = await renderGate();

    await expect.element(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByText("Sample list").elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "Sign out" }).click();
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it("should show the app when the identity call fails otherwise", async () => {
    fakeIdentity(500);

    const screen = await renderGate();

    await expect.element(screen.getByText("Sample list")).toBeVisible();
  });
});
