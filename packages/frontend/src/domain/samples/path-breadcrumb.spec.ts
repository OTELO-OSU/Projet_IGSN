import { describe, expect, it } from "vitest";

import { pathBreadcrumb } from "./path-breadcrumb.ts";

describe("pathBreadcrumb", () => {
  const label = (path: string) => path.toUpperCase();

  it("should label every ancestor of the path", () => {
    expect(pathBreadcrumb("a.b.c", label)).toEqual([
      { path: "a", label: "A" },
      { path: "a.b", label: "A.B" },
      { path: "a.b.c", label: "A.B.C" },
    ]);
  });

  it("should return a single segment for a root path", () => {
    expect(pathBreadcrumb("a", label)).toEqual([{ path: "a", label: "A" }]);
  });
});
