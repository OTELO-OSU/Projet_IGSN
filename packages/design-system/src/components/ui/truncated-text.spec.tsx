import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { TruncatedText } from "./truncated-text.tsx";

const LONG_TEXT = "Peridotite with serpentinized olivine";

function NarrowField({ text }: { text: string }) {
  return (
    <div
      style={{
        width: 64,
        display: "flex",
        flexDirection: "column",
        whiteSpace: "nowrap",
      }}
    >
      <TruncatedText>{text}</TruncatedText>
    </div>
  );
}

describe("TruncatedText", () => {
  it("should show the full text in a tooltip when it overflows its field", async () => {
    await render(<NarrowField text={LONG_TEXT} />);

    await page.getByText(LONG_TEXT).hover();

    await expect
      .element(page.getByRole("tooltip"))
      .toHaveTextContent(LONG_TEXT);
  });

  it("should show no tooltip when the text fits its field", async () => {
    await render(<NarrowField text="Basalt" />);

    await page.getByText("Basalt").hover();

    await expect.element(page.getByRole("tooltip")).not.toBeInTheDocument();
  });
});
