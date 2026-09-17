import type {
  SampleLineage,
  SampleLineageNode,
} from "@projet-igsn/domain/sample/lineage/model";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { LineageView } from "./lineage-view.tsx";

const render = (lineage: SampleLineage) =>
  renderWithRouter(<LineageView lineage={lineage} />, ["/samples/$igsn"]);

const node = (
  id: string,
  generation: number,
  name: string,
  tombstone = false,
): SampleLineageNode => ({
  id,
  igsn: `IGSN${id}`,
  name,
  generation,
  tombstone,
});

const edge = (parentId: string, childId: string) => ({ parentId, childId });

const lineage = (
  nodes: SampleLineageNode[],
  edges: { parentId: string; childId: string }[],
): SampleLineage => ({ nodes, edges });

const family = lineage(
  [
    node("grandparent", -2, "Basalt 40"),
    node("parent", -1, "Basalt 41"),
    node("current", 0, "Basalt 42"),
    node("child", 1, "Basalt 43"),
  ],
  [
    edge("grandparent", "parent"),
    edge("parent", "current"),
    edge("current", "child"),
  ],
);

const manyChildren = lineage(
  [
    node("current", 0, "Basalt 42"),
    ...Array.from({ length: 7 }, (_, index) =>
      node(`child-${index}`, 1, `Thin section ${index}`),
    ),
  ],
  Array.from({ length: 7 }, (_, index) => edge("current", `child-${index}`)),
);

describe("LineageView", () => {
  it("should show every ancestor and descendant as a link naming its relationship", async () => {
    const screen = await render(family);

    await expect
      .element(
        screen.getByRole("link", {
          name: "Basalt 40 Ancestor, 2 generations up",
        }),
      )
      .toHaveAttribute("href", "/samples/IGSNgrandparent");
    await expect
      .element(screen.getByRole("link", { name: "Basalt 41 Parent sample" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: "Basalt 43 Sub-sample" }))
      .toBeInTheDocument();
  });

  it("should show the current sample as plain text, never as a link", async () => {
    const screen = await render(family);

    await expect
      .element(screen.getByText("Current sample"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: /Basalt 42/ }))
      .not.toBeInTheDocument();
  });

  it("should show a tombstoned relative as plain text, never as a link", async () => {
    const screen = await render(
      lineage(
        [
          node("current", 0, "Basalt 42"),
          node("parent", -1, "Basalt 41", true),
        ],
        [edge("parent", "current")],
      ),
    );

    await expect.element(screen.getByText("Basalt 41")).toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: /Basalt 41/ }))
      .not.toBeInTheDocument();
  });

  it("should open the fullscreen lineage dialog from the expand button", async () => {
    const screen = await render(family);

    await screen.getByRole("button", { name: "Expand the lineage" }).click();

    await expect
      .element(screen.getByRole("dialog", { name: "Sample lineage" }))
      .toBeInTheDocument();
  });

  it("should replace the nodes cut from a level with an indicator counting them", async () => {
    const screen = await render(manyChildren);

    await expect.element(screen.getByText("+3 ...")).toBeInTheDocument();
    for (const index of [0, 1, 2, 3]) {
      await expect
        .element(
          screen.getByRole("link", {
            name: `Thin section ${index} Sub-sample`,
          }),
        )
        .toBeInTheDocument();
    }
    await expect
      .element(screen.getByRole("link", { name: /Thin section 4/ }))
      .not.toBeInTheDocument();
  });
});
