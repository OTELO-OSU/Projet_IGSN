import { vi } from "vitest";

import { ADMIN_URL } from "#/admin-url.ts";
import { AdminSampleLink } from "#/domain/samples/admin-sample-link.tsx";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { stubAuth } from "../../../test/stub-auth.tsx";

const id = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const stubApi = (status: number) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("{}", { status }));

const signedIn = {
  isAuthenticated: true,
  user: { access_token: "a-token", profile: { sub: "jean" } },
} as Parameters<typeof stubAuth>[1];

const link = (path: string, label: string) => (
  <AdminSampleLink sampleId={id} path={path} label={label} />
);

describe("AdminSampleLink", () => {
  it("should link to the admin app when the signed-in visitor may reach the sample", async () => {
    const path = `/samples/${id}`;
    stubApi(200);
    const screen = await renderWithRouter(
      stubAuth(link(path, "Edit"), signedIn),
    );

    await expect
      .element(screen.getByRole("link", { name: "Edit" }))
      .toHaveAttribute("href", `${ADMIN_URL}${path}`);
  });

  it("should hide the link when the api refuses access to the sample", async () => {
    const fetchSpy = stubApi(403);
    const screen = await renderWithRouter(
      stubAuth(link(`/samples/${id}`, "Edit"), signedIn),
    );

    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    await expect
      .element(screen.getByRole("link", { name: "Edit" }))
      .not.toBeInTheDocument();
  });

  it("should hide the link from a signed-out visitor", async () => {
    stubApi(200);
    const screen = await renderWithRouter(
      stubAuth(link(`/samples/${id}`, "Edit")),
    );

    await expect
      .element(screen.getByRole("link", { name: "Edit" }))
      .not.toBeInTheDocument();
  });
});
