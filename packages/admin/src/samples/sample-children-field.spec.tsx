import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";
import type {
  CreateSample,
  SampleStatus,
} from "@projet-igsn/domain/sample/sample";

import { HttpResponse, http } from "msw";
import { vi } from "vitest";

import { worker } from "../../test/msw.ts";
import { repickPath } from "../../test/pick-hierarchy.ts";
import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

const SERIES_ID = "3f2504e0-4f89-41d3-9a0c-0305000000c0";

const CHILD: SampleParent = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000c1",
  igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
  name: "Core A",
  material: "rock_and_sediment.mineral",
};

const OTHER_CHILD: SampleParent = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000c2",
  igsn: "01K072TVWVFK5A1RRZ5MY4PPKA",
  name: "Core B",
  material: "rock_and_sediment.mineral",
};

const CHILD_LABEL = `${CHILD.name} (${CHILD.igsn})`;

function fakeApi() {
  worker.use(
    http.get("*/admin/samples/children", ({ request }) => {
      const params = new URL(request.url).searchParams;
      const isScoped = params.get("exclude") === SERIES_ID;
      const matching = params.get("search") === "Core";
      return HttpResponse.json({
        data: isScoped && matching ? [CHILD, OTHER_CHILD] : [],
      });
    }),
    http.get(
      `*/admin/samples/${SERIES_ID}`,
      () => new HttpResponse(null, { status: 404 }),
    ),
  );
}

async function renderSeries(
  defaultValues: Partial<CreateSample>,
  {
    parents = [],
    hasSubSamples = false,
    status = "published",
  }: {
    parents?: SampleParent[];
    hasSubSamples?: boolean;
    status?: SampleStatus;
  } = {},
) {
  fakeApi();
  const onSubmit = vi.fn<(value: CreateSample) => void>();
  const screen = await render(
    <SampleForm
      onCancel={noop}
      sampleId={SERIES_ID}
      parents={parents}
      hasSubSamples={hasSubSamples}
      storedChildren={[CHILD, OTHER_CHILD].filter(({ id }) =>
        defaultValues.childIds?.includes(id),
      )}
      status={status}
      defaultValues={{ name: "Series 2026", ...defaultValues }}
      primaryAction={{ kind: "submit", label: "Create", onSubmit }}
    />,
  );
  return Object.assign(screen, { onSubmit });
}

const childrenSection = (screen: Awaited<ReturnType<typeof renderSeries>>) =>
  screen.getByRole("region", { name: "Children" });

describe("SampleChildrenField", () => {
  it.each([
    { type: "serie_of_sample.core", shown: true },
    { type: "serie_of_sample", shown: true },
    { type: "dredge", shown: false },
  ])(
    "should offer children to a series only: $type",
    async ({ type, shown }) => {
      const screen = await renderSeries({ type });

      await expect.element(screen.getByLabelText("Name")).toBeVisible();
      if (shown) {
        await expect.element(childrenSection(screen)).toBeVisible();
      } else {
        await expect.element(childrenSection(screen)).not.toBeInTheDocument();
      }
    },
  );

  it("should hint to publish a draft series before picking its children", async () => {
    const screen = await renderSeries(
      { type: "serie_of_sample.core" },
      { status: "draft" },
    );

    await expect
      .element(childrenSection(screen))
      .toHaveTextContent("Publish the series before adding samples to it");
    await expect
      .element(screen.getByRole("combobox", { name: "Add a sample" }))
      .not.toBeInTheDocument();
  });

  it("should search the children eligible under the series type, excluding the series itself, and add the picked one", async () => {
    const screen = await renderSeries({ type: "serie_of_sample.core" });

    await screen.getByRole("combobox", { name: "Add a sample" }).click();
    await screen.getByPlaceholder("Search by name or IGSN").fill("Core");
    await screen.getByRole("option", { name: /^Core A/ }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(screen.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ childIds: [CHILD.id] }),
      ),
    );
  });

  it("should replace a stored child, offering the samples not yet in the series", async () => {
    const screen = await renderSeries({
      type: "serie_of_sample.core",
      childIds: [CHILD.id],
    });

    const row = screen.getByRole("combobox", {
      name: "Sample 1 in this series",
    });
    await expect.element(row).toHaveTextContent(CHILD_LABEL);
    await row.click();
    await screen.getByPlaceholder("Search by name or IGSN").fill("Core");
    await expect
      .element(screen.getByRole("option", { name: /^Core B/ }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("option", { name: /^Core A/ }))
      .not.toBeInTheDocument();
    await screen.getByRole("option", { name: /^Core B/ }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(screen.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ childIds: [OTHER_CHILD.id] }),
      ),
    );
  });

  it("should name a stored child and detach it", async () => {
    const screen = await renderSeries({
      type: "serie_of_sample.core",
      childIds: [CHILD.id],
    });

    await screen.getByRole("button", { name: `Detach ${CHILD_LABEL}` }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(screen.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ childIds: [] }),
      ),
    );
  });

  it("should keep the picked children when the series sub-type changes", async () => {
    const screen = await renderSeries({
      type: "serie_of_sample.core",
      childIds: [CHILD.id],
    });

    await expect
      .element(screen.getByRole("button", { name: `Detach ${CHILD_LABEL}` }))
      .toBeVisible();
    await repickPath(screen, "Core", "Dredge");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(screen.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "serie_of_sample.dredge",
          childIds: [CHILD.id],
        }),
      ),
    );
  });

  it.each([
    { parents: [], hasSubSamples: false, offered: true },
    { parents: [CHILD], hasSubSamples: false, offered: false },
    { parents: [], hasSubSamples: true, offered: false },
  ])(
    "should offer a series type to a sample with neither parent nor sub-sample only: $offered",
    async ({ parents, hasSubSamples, offered }) => {
      const screen = await renderSeries({}, { parents, hasSubSamples });

      await screen
        .getByRole("combobox", { name: "Type *", exact: true })
        .click();

      const option = screen.getByRole("option", {
        name: "Series of samples",
        exact: true,
      });
      await expect
        .element(screen.getByRole("option", { name: "Dredge", exact: true }))
        .toBeVisible();
      if (offered) {
        await expect.element(option).toBeVisible();
      } else {
        await expect.element(option).not.toBeInTheDocument();
      }
    },
  );
});
