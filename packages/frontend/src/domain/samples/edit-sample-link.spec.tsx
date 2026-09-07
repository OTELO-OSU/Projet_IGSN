import { vi } from "vitest";

import { ADMIN_URL } from "#/admin-url.ts";
import { EditSampleLink } from "#/domain/samples/edit-sample-link.tsx";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { stubAuth } from "../../../test/stub-auth.tsx";

const id = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const stubApi = (status: number) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("{}", { status }));

const signedIn = {
  isAuthenticated: true,
  user: { access_token: "a-token" },
} as Parameters<typeof stubAuth>[1];

describe("EditSampleLink", () => {
  it("should link to the admin sample page when the signed-in visitor may reach it", async () => {
    stubApi(200);
    const screen = await renderWithRouter(
      stubAuth(<EditSampleLink sampleId={id} />, signedIn),
    );

    await expect
      .element(screen.getByRole("link", { name: "Edit" }))
      .toHaveAttribute("href", `${ADMIN_URL}/samples/${id}`);
  });

  it("should hide the link when the api refuses access to the sample", async () => {
    const fetchSpy = stubApi(403);
    const screen = await renderWithRouter(
      stubAuth(<EditSampleLink sampleId={id} />, signedIn),
    );

    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    await expect
      .element(screen.getByRole("link", { name: "Edit" }))
      .not.toBeInTheDocument();
  });

  it("should hide the link from a signed-out visitor", async () => {
    stubApi(200);
    const screen = await renderWithRouter(
      stubAuth(<EditSampleLink sampleId={id} />, {}),
    );

    await expect
      .element(screen.getByRole("link", { name: "Edit" }))
      .not.toBeInTheDocument();
  });
});
