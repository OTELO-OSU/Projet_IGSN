import { vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import type { SearchEngine } from "./search-engine-tabs.tsx";

import { SearchCompose } from "./search-compose.tsx";

const noSeed = { q: undefined, bbox: undefined };

describe("SearchCompose", () => {
  it("should render the primary text engine and the inline add button", async () => {
    const screen = await render(
      <SearchCompose
        initialActive={["text"]}
        initialDrafts={noSeed}
        onSearch={vi.fn()}
      />,
    );

    await expect
      .element(screen.getByRole("searchbox", { name: "Search samples" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Add location" }))
      .toBeInTheDocument();
  });

  it("should offer adding the text engine when location is primary", async () => {
    const screen = await render(
      <SearchCompose
        initialActive={["location"]}
        initialDrafts={noSeed}
        onSearch={vi.fn()}
      />,
    );

    await screen.getByRole("button", { name: "Add terms" }).click();

    await expect
      .element(screen.getByRole("searchbox", { name: "Search samples" }))
      .toBeInTheDocument();
  });

  it("should add the location engine with a remove control when picked", async () => {
    const screen = await render(
      <SearchCompose
        initialActive={["text"]}
        initialDrafts={noSeed}
        onSearch={vi.fn()}
      />,
    );

    await screen.getByRole("button", { name: "Add location" }).click();

    await expect
      .element(screen.getByRole("button", { name: "Remove Location" }))
      .toBeInTheDocument();
  });

  it("should spell out what the remove control drops on hover", async () => {
    const screen = await render(
      <SearchCompose
        initialActive={["text", "location"]}
        initialDrafts={noSeed}
        onSearch={vi.fn()}
      />,
    );

    await screen.getByRole("button", { name: "Remove Location" }).hover();

    await expect
      .element(page.getByRole("tooltip"))
      .toHaveTextContent("Remove Location");
  });

  it.each([
    {
      active: ["text", "location"] as SearchEngine[],
      shrunk: false,
      locked: "Terms",
      removable: "Location",
    },
    {
      active: ["location", "text"] as SearchEngine[],
      shrunk: true,
      locked: "Location",
      removable: "Terms",
    },
  ])(
    "should give the primary $locked engine no remove control",
    async ({ active, shrunk, locked, removable }) => {
      const screen = await render(
        <SearchCompose
          initialActive={active}
          initialDrafts={{ q: "granite", bbox: "-10,40,10,50" }}
          onSearch={vi.fn()}
          shrunk={shrunk}
        />,
      );

      await expect
        .element(screen.getByRole("button", { name: `Remove ${removable}` }))
        .toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: `Remove ${locked}` }).query(),
      ).toBeNull();
    },
  );

  it("should hide the add button when all engines are active and restore it on remove", async () => {
    const screen = await render(
      <SearchCompose
        initialActive={["text", "location"]}
        initialDrafts={noSeed}
        onSearch={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Add location" }).query(),
    ).toBeNull();

    await screen.getByRole("button", { name: "Remove Location" }).click();

    await expect
      .element(screen.getByRole("button", { name: "Add location" }))
      .toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Location" }).query(),
    ).toBeNull();
  });

  it("should submit both engines' drafts once via the single Search button", async () => {
    const onSearch = vi.fn();
    const screen = await render(
      <SearchCompose
        initialActive={["text", "location"]}
        initialDrafts={{ q: undefined, bbox: "-10,40,10,50" }}
        onSearch={onSearch}
      />,
    );

    await screen
      .getByRole("searchbox", { name: "Search samples" })
      .fill("granite");
    await screen.getByRole("button", { name: "Search", exact: true }).click();

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith({
      q: "granite",
      bbox: "-10,40,10,50",
      engine: "text",
      page: 1,
    });
  });

  it("should keep Search as the last control once the map is open", async () => {
    const screen = await render(
      <SearchCompose
        initialActive={["text", "location"]}
        initialDrafts={noSeed}
        onSearch={vi.fn()}
      />,
    );

    const buttons = screen.getByRole("button").elements();

    expect(buttons.at(-1)).toHaveTextContent("Search");
  });

  it("should omit a removed engine's draft from the next search", async () => {
    const onSearch = vi.fn();
    const screen = await render(
      <SearchCompose
        initialActive={["text", "location"]}
        initialDrafts={{ q: "granite", bbox: "-10,40,10,50" }}
        onSearch={onSearch}
      />,
    );

    await screen.getByRole("button", { name: "Remove Location" }).click();
    await screen.getByRole("button", { name: "Search", exact: true }).click();

    expect(onSearch).toHaveBeenCalledWith({
      q: "granite",
      engine: "text",
      page: 1,
    });
  });

  it("should still submit an engine added but not filled in yet", async () => {
    const onSearch = vi.fn();
    const screen = await render(
      <SearchCompose
        initialActive={["text"]}
        initialDrafts={noSeed}
        onSearch={onSearch}
      />,
    );

    await screen.getByRole("button", { name: "Add location" }).click();
    await screen
      .getByRole("searchbox", { name: "Search samples" })
      .fill("granite");
    await screen.getByRole("button", { name: "Search", exact: true }).click();

    expect(onSearch).toHaveBeenCalledWith({
      q: "granite",
      bbox: "",
      engine: "text",
      page: 1,
    });
  });

  it("should keep the text engine open when its query was cleared", async () => {
    const onSearch = vi.fn();
    const screen = await render(
      <SearchCompose
        initialActive={["text", "location"]}
        initialDrafts={{ q: "granite", bbox: "-10,40,10,50" }}
        onSearch={onSearch}
        shrunk
      />,
    );

    await screen.getByRole("searchbox", { name: "Search samples" }).fill("");
    await screen.getByRole("button", { name: "Search", exact: true }).click();

    expect(onSearch).toHaveBeenCalledWith({
      q: "",
      bbox: "-10,40,10,50",
      engine: "text",
      page: 1,
    });
  });

  it("should refuse an empty search on the landing launcher", async () => {
    const onSearch = vi.fn();
    const screen = await render(
      <SearchCompose
        initialActive={["text"]}
        initialDrafts={noSeed}
        onSearch={onSearch}
      />,
    );

    await expect
      .element(screen.getByRole("button", { name: "Search", exact: true }))
      .toBeDisabled();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("should allow an empty search to clear a search that has run", async () => {
    const onSearch = vi.fn();
    const screen = await render(
      <SearchCompose
        initialActive={["text"]}
        initialDrafts={{ q: "granite", bbox: undefined }}
        onSearch={onSearch}
        shrunk
      />,
    );

    await screen.getByRole("searchbox", { name: "Search samples" }).fill("");
    await screen.getByRole("button", { name: "Search", exact: true }).click();

    expect(onSearch).toHaveBeenCalledWith({ q: "", engine: "text", page: 1 });
  });

  it("should drop the tabs but still offer adding an engine on the results page", async () => {
    const screen = await render(
      <SearchCompose
        initialActive={["text"]}
        initialDrafts={{ q: "granite", bbox: undefined }}
        onSearch={vi.fn()}
        shrunk
      />,
    );

    await expect
      .element(screen.getByRole("searchbox", { name: "Search samples" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Add location" }))
      .toBeInTheDocument();
    expect(screen.getByRole("tab").query()).toBeNull();
  });

  it("should re-run the search at once when the results page drops an engine", async () => {
    const onSearch = vi.fn();
    const screen = await render(
      <SearchCompose
        initialActive={["text", "location"]}
        initialDrafts={{ q: "granite", bbox: "-10,40,10,50" }}
        onSearch={onSearch}
        shrunk
      />,
    );

    await screen.getByRole("button", { name: "Remove Location" }).click();

    expect(onSearch).toHaveBeenCalledWith({
      q: "granite",
      engine: "text",
      page: 1,
    });
  });

  it("should let the reader enlarge the results banner map", async () => {
    const screen = await render(
      <SearchCompose
        initialActive={["location"]}
        initialDrafts={{ q: undefined, bbox: "-10,40,10,50" }}
        onSearch={vi.fn()}
        shrunk
      />,
    );

    await screen.getByRole("button", { name: "Enlarge map" }).click();

    await expect
      .element(screen.getByRole("button", { name: "Shrink map" }))
      .toBeInTheDocument();
  });

  it("should offer no map size toggle before a search has run", async () => {
    const screen = await render(
      <SearchCompose
        initialActive={["location"]}
        initialDrafts={noSeed}
        onSearch={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Enlarge map" }).query(),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Shrink map" }).query(),
    ).toBeNull();
  });

  it("should collapse to the picked primary and discard the other draft on tab switch", async () => {
    const onSearch = vi.fn();
    const screen = await render(
      <SearchCompose
        initialActive={["text", "location"]}
        initialDrafts={{ q: "granite", bbox: "-10,40,10,50" }}
        onSearch={onSearch}
      />,
    );

    await screen.getByRole("tab", { name: "Location" }).click();

    expect(
      screen.getByRole("searchbox", { name: "Search samples" }).query(),
    ).toBeNull();

    await screen.getByRole("button", { name: "Search", exact: true }).click();

    expect(onSearch).toHaveBeenCalledWith({
      bbox: "-10,40,10,50",
      engine: "location",
      page: 1,
    });
  });
});
