import { describe, expect, it } from "vitest";

import { createCollectionMethodLabel } from "./collection-method-label.ts";

// Stub messages: every id resolves to its own name, so we assert the factory
// maps each code to the right message id (the only logic here; real strings are
// paraglide's job).
const messages = new Proxy(
  {},
  { get: (_target, id) => () => String(id) },
) as Parameters<typeof createCollectionMethodLabel>[0];

describe("createCollectionMethodLabel", () => {
  const label = createCollectionMethodLabel(messages);

  it.each([
    ["coring", "collection_method_coring"],
    ["coring.gravity_corer", "collection_method_coring_gravity_corer"],
    ["grab.hov", "collection_method_grab_hov"],
    ["unknown", "collection_method_unknown"],
  ] as const)("should map %s to its message id", (method, id) => {
    expect(label(method)).toBe(id);
  });
});
