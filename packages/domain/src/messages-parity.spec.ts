import { describe, expect, it } from "vitest";

import en from "../messages/en.json";
import fr from "../messages/fr.json";

describe("messages parity", () => {
  it("gives the French catalog every English key in the same order", () => {
    expect(Object.keys(fr)).toEqual(Object.keys(en));
  });
});
