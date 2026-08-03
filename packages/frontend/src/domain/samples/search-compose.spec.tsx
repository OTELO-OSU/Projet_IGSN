import { vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

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

    await screen.getByRole("button", { name: "Add text search" }).click();

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

    // Radix portals the tooltip out of the render container, hence `page`.
    await expect
      .element(page.getByRole("tooltip"))
      .toHaveTextContent("Remove Location");
  });

  it("should give the primary engine no remove control", async () => {
    const screen = await render(
      <SearchCompose
        initialActive={["text", "location"]}
        initialDrafts={noSeed}
        onSearch={vi.fn()}
      />,
    );

    await expect
      .element(screen.getByRole("button", { name: "Remove Location" }))
      .toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Text" }).query(),
    ).toBeNull();
  });

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

  it("should keep the add button usable when a search is already present", async () => {
    const screen = await render(
      <SearchCompose
        initialActive={["text"]}
        initialDrafts={{ q: "granite", bbox: undefined }}
        onSearch={vi.fn()}
        shrunk
      />,
    );

    await screen.getByRole("button", { name: "Add location" }).click();

    await expect
      .element(screen.getByRole("button", { name: "Remove Location" }))
      .toBeInTheDocument();
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
      page: 1,
    });
  });

  it("should carry the primary engine when location leads the stack", async () => {
    const onSearch = vi.fn();
    const screen = await render(
      <SearchCompose
        initialActive={["location", "text"]}
        initialDrafts={{ q: undefined, bbox: "-10,40,10,50" }}
        onSearch={onSearch}
      />,
    );

    await screen
      .getByRole("searchbox", { name: "Search samples" })
      .fill("granite");
    await screen.getByRole("button", { name: "Search", exact: true }).click();

    expect(onSearch).toHaveBeenCalledWith({
      q: "granite",
      bbox: "-10,40,10,50",
      engine: "location",
      page: 1,
    });
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

    expect(onSearch).toHaveBeenCalledWith({ q: "granite", page: 1 });
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

    expect(onSearch).toHaveBeenCalledWith({ q: "", page: 1 });
  });

  it("should drop the tabs and the add button once the engines are fixed", async () => {
    const screen = await render(
      <SearchCompose
        initialActive={["text"]}
        initialDrafts={{ q: "granite", bbox: undefined }}
        onSearch={vi.fn()}
        shrunk
        fixedEngines
      />,
    );

    await expect
      .element(screen.getByRole("searchbox", { name: "Search samples" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Search", exact: true }))
      .toBeInTheDocument();
    expect(screen.getByRole("tab").query()).toBeNull();
    expect(
      screen.getByRole("button", { name: "Add location" }).query(),
    ).toBeNull();
  });

  it("should keep both fixed engines without a remove control", async () => {
    const screen = await render(
      <SearchCompose
        initialActive={["text", "location"]}
        initialDrafts={{ q: "granite", bbox: "-10,40,10,50" }}
        onSearch={vi.fn()}
        shrunk
        fixedEngines
      />,
    );

    await expect
      .element(screen.getByRole("searchbox", { name: "Search samples" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("group", { name: "Search area map" }))
      .toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Location" }).query(),
    ).toBeNull();
  });

  it("should let the reader enlarge the results banner map", async () => {
    const screen = await render(
      <SearchCompose
        initialActive={["location"]}
        initialDrafts={{ q: undefined, bbox: "-10,40,10,50" }}
        onSearch={vi.fn()}
        shrunk
        fixedEngines
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

    expect(onSearch).toHaveBeenCalledWith({ bbox: "-10,40,10,50", page: 1 });
  });
});
