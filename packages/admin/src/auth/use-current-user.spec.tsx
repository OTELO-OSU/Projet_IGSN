import { HttpResponse, http } from "msw";

import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { useCurrentUser } from "./use-current-user.ts";

function Probe() {
  const { data } = useCurrentUser();
  return <p>{data ? `${data.status}/${String(data.superAdmin)}` : "…"}</p>;
}

describe("useCurrentUser", () => {
  it("should expose the caller's moderation state", async () => {
    const tokens: (string | null)[] = [];
    worker.use(
      http.get("*/admin/currentUser", ({ request }) => {
        tokens.push(request.headers.get("Authorization"));
        return HttpResponse.json({
          id: "3f2504e0-4f89-41d3-9a0c-0305000000f2",
          sub: "s",
          name: "Marie Dupont",
          orcid: null,
          status: "accepted",
          superAdmin: false,
          managedLaboratories: [],
          managedManualGroups: [],
        });
      }),
    );

    const screen = await render(<Probe />);

    await expect.element(screen.getByText("accepted/false")).toBeVisible();
    expect(tokens).toEqual(["Bearer tok"]);
  });
});
