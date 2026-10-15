import { MAX_MAP_DETAILS_NUMBERS } from "@projet-igsn/domain/sample/map/model";
import { vi } from "vitest";

import { renderWithRouter } from "../../../../test/render-with-router.tsx";
import { useMapSampleDetails } from "./map-sample-details.ts";

const NUMBERS = Array.from(
  { length: MAX_MAP_DETAILS_NUMBERS + 1 },
  (_, index) => index + 1,
);

const requestedNumbersOf = (input: unknown) =>
  (input as URL).searchParams.get("numbers")?.split(",").map(Number) ?? [];

function DetailsCount({ numbers }: { numbers: number[] }) {
  const details = useMapSampleDetails(numbers);
  return <p>{details.size} details</p>;
}

describe("useMapSampleDetails", () => {
  it("should split more numbers than the api accepts into several requests", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input) =>
        new Response(
          JSON.stringify({
            data: requestedNumbersOf(input).map((internalNumber) => ({
              internalNumber,
              igsn: "0123456789ABCDEFGHJKMNPQRS",
              name: `Sample ${internalNumber}`,
            })),
          }),
        ),
    );

    const screen = await renderWithRouter(<DetailsCount numbers={NUMBERS} />);

    await expect
      .element(screen.getByText(`${NUMBERS.length} details`))
      .toBeInTheDocument();
    expect(
      fetch.mock.calls.map(([input]) => requestedNumbersOf(input).length),
    ).toEqual([MAX_MAP_DETAILS_NUMBERS, 1]);
  });
});
