import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { HttpResponse, http } from "msw";

import { fakeSample } from "../../test/fake-sample.ts";
import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { useSample } from "./use-sample.ts";
import { useUpdateSample } from "./use-update-sample.ts";

const INPUT: CreateSample = {
  name: "Basalte du Massif Central",
  nature: "thin_section",
  type: null,
};

function Probe() {
  const { data } = useSample(fakeSample.id);
  const update = useUpdateSample(fakeSample.id);
  if (!data) return <p>…</p>;
  return (
    <button type="button" onClick={() => update.mutate(INPUT)}>
      Save
    </button>
  );
}

describe("useUpdateSample", () => {
  it("should send the cached updatedAt as the ISO string the api returned", async () => {
    const bodies: unknown[] = [];
    worker.use(
      http.get(`*/admin/samples/${fakeSample.id}`, () =>
        HttpResponse.json({
          data: fakeSample,
          role: "owner",
          manualGroupOptions: [],
        }),
      ),
      http.put(`*/admin/samples/${fakeSample.id}`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ data: fakeSample });
      }),
    );

    const screen = await render(<Probe />);
    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(bodies).toEqual([
        { ...INPUT, expectedUpdatedAt: "2026-07-01T10:00:00.000Z" },
      ]),
    );
  });
});
