import { render } from "vitest-browser-react";

import { useActiveSection } from "./use-active-section.ts";

function Probe({
  ids,
  render: rendered = ids,
}: {
  ids: string[];
  render?: string[];
}) {
  const activeId = useActiveSection(ids);
  return (
    <>
      <p>active: {activeId}</p>
      {rendered.map((id) => (
        <section key={id} id={id} style={{ height: "150vh" }}>
          {id}
        </section>
      ))}
    </>
  );
}

function scrollToSection(id: string) {
  const section = document.getElementById(id);
  window.scrollTo(
    0,
    (section?.getBoundingClientRect().top ?? 0) + window.scrollY,
  );
}

describe("useActiveSection", () => {
  afterEach(() => window.scrollTo(0, 0));

  it("should return the first section before anything is scrolled", async () => {
    const screen = await render(
      <Probe ids={["sample", "description", "related-resources"]} />,
    );

    await expect
      .element(screen.getByText("active: sample"))
      .toBeInTheDocument();
  });

  it("should return the section scrolled into the reading band", async () => {
    const screen = await render(
      <Probe ids={["sample", "description", "related-resources"]} />,
    );

    scrollToSection("description");

    await expect
      .element(screen.getByText("active: description"))
      .toBeInTheDocument();
  });

  it("should return the first section still in the band when several intersect", async () => {
    const screen = await render(
      <Probe ids={["sample", "description", "related-resources"]} />,
    );

    scrollToSection("related-resources");
    await expect
      .element(screen.getByText("active: related-resources"))
      .toBeInTheDocument();

    scrollToSection("description");

    await expect
      .element(screen.getByText("active: description"))
      .toBeInTheDocument();
  });

  it("should keep the first section when an id matches no element", async () => {
    const screen = await render(
      <Probe ids={["sample", "missing"]} render={["sample"]} />,
    );

    await expect
      .element(screen.getByText("active: sample"))
      .toBeInTheDocument();
  });
});
