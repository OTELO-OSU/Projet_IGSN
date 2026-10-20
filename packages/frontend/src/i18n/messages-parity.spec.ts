import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

const PLACEHOLDER = /\{\w+\}/g;

function describeShapeOf(messages: Record<string, string>) {
  return Object.entries(messages).map(([key, value]) => ({
    key,
    placeholders: value.match(PLACEHOLDER)?.toSorted() ?? [],
    lineBreaks: value.split("\n").length - 1,
  }));
}

describe("French messages", () => {
  it("should carry every English key in the same order", () => {
    expect(Object.keys(fr)).toEqual(Object.keys(en));
  });

  it("should keep each English message's placeholders and line breaks", () => {
    expect(describeShapeOf(fr)).toEqual(describeShapeOf(en));
  });
});
