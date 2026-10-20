import { renderHook } from "vitest-browser-react";

import type { SearchParams } from "./search-params.ts";

import { useSampleSelection } from "./use-sample-selection.ts";

const search = { q: "basalt", page: 1 } as SearchParams;

describe("useSampleSelection", () => {
  it.each([
    ["keep", "the page changes", { ...search, page: 2 }, { A: true }],
    ["keep", "the page size changes", { ...search, perPage: 25 }, { A: true }],
    ["keep", "the map opens", { ...search, map: true }, { A: true }],
    ["clear", "a facet changes", { ...search, nature: "powder" }, {}],
    ["clear", "the search changes", { ...search, q: "granite" }, {}],
  ] as const)(
    "should %s the checked samples when %s",
    async (_verb, _change, next, expected) => {
      const { result, rerender, act } = await renderHook(
        (props?: SearchParams) => useSampleSelection(props ?? search),
        { initialProps: search },
      );

      await act(() => result.current[1]({ A: true }));
      await rerender(next as SearchParams);

      expect(result.current[0]).toEqual(expected);
    },
  );

  it("should not bring the checked samples back when the filters return", async () => {
    const { result, rerender, act } = await renderHook(
      (props?: SearchParams) => useSampleSelection(props ?? search),
      { initialProps: search },
    );

    await act(() => result.current[1]({ A: true }));
    await rerender({ ...search, nature: "powder" } as SearchParams);
    await rerender(search);

    expect(result.current[0]).toEqual({});
  });
});
