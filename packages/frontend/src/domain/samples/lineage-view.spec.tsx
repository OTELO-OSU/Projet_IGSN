import type {
  SampleLineage,
  SampleLineageNode,
} from "@projet-igsn/domain/sample/lineage/model";

import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render as renderRoot } from "vitest-browser-react";
import { userEvent } from "vitest/browser";

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

  it("should fit the fullscreen graph to the new tree after navigating to a relative", async () => {
    const lineages: Record<string, SampleLineage> = {
      IGSNcurrent: lineage(
        [node("current", 0, "Basalt 42"), node("parent", -1, "Basalt 41")],
        [edge("parent", "current")],
      ),
      IGSNparent: lineage(
        [
          node("parent", 0, "Basalt 41"),
          node("current", 1, "Basalt 42"),
          node("child", 2, "Basalt 43"),
        ],
        [edge("parent", "current"), edge("current", "child")],
      ),
    };
    const rootRoute = createRootRoute();
    const sampleRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/samples/$igsn",
      component: function SamplePage() {
        const { igsn } = sampleRoute.useParams();
        return <LineageView lineage={lineages[igsn]!} />;
      },
    });
    const screen = await renderRoot(
      <RouterProvider
        router={createRouter({
          routeTree: rootRoute.addChildren([sampleRoute]),
          history: createMemoryHistory({
            initialEntries: ["/samples/IGSNcurrent"],
          }),
        })}
      />,
    );

    await screen.getByRole("button", { name: "Expand the lineage" }).click();
    const dialog = screen.getByRole("dialog", { name: "Sample lineage" });
    const parent = dialog.getByRole("link", {
      name: "Basalt 41 Parent sample",
    });
    await expect.element(parent).toBeInTheDocument();
    parent.element().focus();
    await userEvent.keyboard("{Enter}");

    const graph = dialog.getByTestId("rf__wrapper");
    const farthest = dialog.getByText("Basalt 43");
    await expect.element(farthest).toBeInTheDocument();
    await expect
      .poll(() => {
        const box = graph.element().getBoundingClientRect();
        const node = farthest.element().getBoundingClientRect();
        return node.left >= box.left && node.right <= box.right;
      })
      .toBe(true);
  });
});
