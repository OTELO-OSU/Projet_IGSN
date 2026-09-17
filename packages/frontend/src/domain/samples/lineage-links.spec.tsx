import type { SampleLineageNode } from "@projet-igsn/domain/sample/lineage/model";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { LineageLinks } from "./lineage-links.tsx";

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

const render = (nodes: SampleLineageNode[]) =>
  renderWithRouter(<LineageLinks nodes={nodes} />, ["/samples/$igsn"]);

describe("LineageLinks", () => {
  it("should link every relative, naming its relationship", async () => {
    const screen = await render([
      node("grandparent", -2, "Basalt 40"),
      node("parent", -1, "Basalt 41"),
      node("current", 0, "Basalt 42"),
      node("child", 1, "Basalt 43"),
    ]);

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

  it("should leave out the current sample", async () => {
    const screen = await render([node("current", 0, "Basalt 42")]);

    await expect
      .element(screen.getByRole("link", { name: /Basalt 42/ }))
      .not.toBeInTheDocument();
  });

  it("should name a tombstoned relative without linking to it", async () => {
    const screen = await render([node("parent", -1, "Basalt 41", true)]);

    await expect
      .element(screen.getByText("Basalt 41 Parent sample"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: /Basalt 41/ }))
      .not.toBeInTheDocument();
  });
});
