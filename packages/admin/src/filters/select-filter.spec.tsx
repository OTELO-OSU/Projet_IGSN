import { render } from "../../test/render.tsx";
import { SelectFilter } from "./select-filter.tsx";

describe("SelectFilter", () => {
  it("should show its Any label as a muted placeholder when nothing is selected", async () => {
    const screen = await render(
      <SelectFilter
        id="status"
        label="Status"
        anyLabel="Any status"
        items={[{ value: "draft", label: "Draft" }]}
        value={undefined}
        onChange={() => {}}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Status" });
    await expect.element(trigger).toHaveTextContent("Any status");
    await expect.element(trigger).toHaveAttribute("data-placeholder");
  });
});
