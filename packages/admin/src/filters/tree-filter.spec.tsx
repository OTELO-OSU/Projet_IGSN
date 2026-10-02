import { render } from "../../test/render.tsx";
import { TreeFilter } from "./tree-filter.tsx";

describe("TreeFilter", () => {
  it("should mute its Any label when nothing is selected", async () => {
    const screen = await render(
      <TreeFilter
        id="material"
        nodes={[{ key: "rock", label: "Rock", value: "rock", children: [] }]}
        value={undefined}
        onChange={() => {}}
        selectedLabel={undefined}
        anyLabel="Any material"
        searchLabel="Search a material"
        emptyText="No material"
      />,
    );

    await expect
      .element(screen.getByRole("combobox").getByText("Any material"))
      .toHaveClass("text-muted-foreground");
  });
});
