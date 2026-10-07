import { describe, expect, it } from "vitest";

import { filterFaq } from "./filter-faq.ts";

const ITEMS = [
  {
    value: "steps",
    title: "How do I search?",
    ordered: true,
    entries: ["Type a word.", "Draw an area on the map."],
  },
  {
    value: "rules",
    title: "What are the rules?",
    ordered: false,
    entries: [
      "Accents do not matter: rhone finds Rhône.",
      "Words of 5 letters tolerate one typo.",
      "Only published samples are listed.",
    ],
  },
];

describe("filterFaq", () => {
  it("should keep only the entries holding every word, ignoring case and accents, with their position", () => {
    expect(filterFaq(ITEMS, "  RHÔNE accents ")).toEqual([
      {
        value: "rules",
        title: "What are the rules?",
        ordered: false,
        entries: [
          { position: 1, text: "Accents do not matter: rhone finds Rhône." },
        ],
      },
    ]);
  });

  it("should keep every entry of an item whose title matches", () => {
    expect(filterFaq(ITEMS, "how search")).toEqual([
      {
        value: "steps",
        title: "How do I search?",
        ordered: true,
        entries: [
          { position: 1, text: "Type a word." },
          { position: 2, text: "Draw an area on the map." },
        ],
      },
    ]);
  });

  it("should keep every item for a blank query", () => {
    expect(filterFaq(ITEMS, " ").map(({ entries }) => entries.length)).toEqual([
      2, 3,
    ]);
  });
});
