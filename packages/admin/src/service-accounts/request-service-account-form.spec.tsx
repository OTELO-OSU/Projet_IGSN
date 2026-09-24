import { laboratoryLabel } from "@projet-igsn/domain/institutional-group/label";
import { HttpResponse, http } from "msw";
import { vi } from "vitest";
import { page } from "vitest/browser";

import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { RequestServiceAccountForm } from "./request-service-account-form.tsx";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    user: { access_token: "a-token", profile: { sub: "jean" } },
  }),
}));

const laboratory = "UMR7358";
const laboratoryOption = `${laboratoryLabel(laboratory)} (${laboratory})`;

const group = {
  id: "01980e2d-6f9b-7000-9000-000000000001",
  name: "ANR CritMet",
};

type SeenPost = { pathname: string; token: string | null; body: unknown };

function fakeApi() {
  const posts: SeenPost[] = [];
  worker.use(
    http.get("*/admin/currentUser/attachable-manual-groups", () =>
      HttpResponse.json({ data: [group] }),
    ),
    http.get("*/admin/currentUser/service-accounts/requestable-groups", () =>
      HttpResponse.json({
        data: { organizations: [], osus: [], laboratories: [laboratory] },
      }),
    ),
    http.post(
      "*/admin/currentUser/service-accounts/requests",
      async ({ request }) => {
        posts.push({
          pathname: new URL(request.url).pathname,
          token: request.headers.get("Authorization"),
          body: await request.json(),
        });
        return new HttpResponse(null, { status: 204 });
      },
    ),
  );
  return posts;
}

const renderForm = (onSent = vi.fn()) =>
  render(<RequestServiceAccountForm onSent={onSent} />);

describe("RequestServiceAccountForm", () => {
  it("should post the service name and the picked group with the requester's token", async () => {
    const posts = fakeApi();
    const onSent = vi.fn();
    const screen = await renderForm(onSent);

    await screen.getByLabelText("Service name").fill("Basalt pipeline");
    await screen
      .getByLabelText("Why do you need a service account?")
      .fill("Automate our basalt uploads");
    await screen.getByRole("combobox", { name: "Groups to access" }).click();
    await page.getByRole("option", { name: group.name }).click();
    await screen
      .getByRole("combobox", { name: "Laboratories to access" })
      .click();
    await page.getByRole("option", { name: laboratoryOption }).click();
    await page.getByRole("button", { name: "Send request" }).click();

    await vi.waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toEqual({
      pathname: "/api/admin/currentUser/service-accounts/requests",
      token: "Bearer a-token",
      body: {
        name: "Basalt pipeline",
        reason: "Automate our basalt uploads",
        managedGroups: {
          organizations: [],
          osus: [],
          laboratories: [laboratory],
          manualGroupIds: [group.id],
        },
      },
    });
    await vi.waitFor(() => expect(onSent).toHaveBeenCalled());
  });

  it("should offer only the laboratories the requester may request", async () => {
    fakeApi();
    const screen = await renderForm();

    await screen
      .getByRole("combobox", { name: "Laboratories to access" })
      .click();

    await expect
      .poll(() => page.getByRole("option").elements())
      .toHaveLength(1);
  });

  it("should replace a picker the requester may request nothing from with a message", async () => {
    fakeApi();
    const screen = await renderForm();

    await expect
      .element(screen.getByText("You don't have access to any organization."))
      .toBeVisible();
    await expect
      .element(screen.getByText("Organizations to access"))
      .toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Organizations to access" }).query(),
    ).toBeNull();
  });

  it("should flag the name and the reason and post nothing when both are blank", async () => {
    const posts = fakeApi();
    const screen = await renderForm();

    await screen.getByRole("button", { name: "Send request" }).click();

    await expect
      .element(screen.getByLabelText("Service name"))
      .toHaveAttribute("aria-invalid", "true");
    await expect
      .element(screen.getByLabelText("Why do you need a service account?"))
      .toHaveAttribute("aria-invalid", "true");
    await expect
      .element(screen.getByRole("alert").first())
      .toHaveTextContent("This field is required.");
    expect(posts).toEqual([]);
  });
});
