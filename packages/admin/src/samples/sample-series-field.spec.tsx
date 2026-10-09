import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";
import type {
  CreateSample,
  SampleStatus,
} from "@projet-igsn/domain/sample/sample";
import type { SampleSeries } from "@projet-igsn/domain/sample/series/model";

import { HttpResponse, http } from "msw";
import { vi } from "vitest";

import type { SampleFormParent } from "./sample-form.tsx";

import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

const MEMBER_ID = "3f2504e0-4f89-41d3-9a0c-0305000000d1";

const SERIES: SampleParent = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000c0",
  igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
  name: "Core series",
  material: null,
};

const STORED_SERIES: SampleSeries = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000c3",
  igsn: null,
  name: "Dredge series",
  material: null,
};

const PARENT: SampleFormParent = {
  igsn: "01K072TVWVFK5A1RRZ5MY4PPKA",
  name: "Parent core",
  material: "rock_and_sediment.mineral",
};

function fakeApi() {
  worker.use(
    http.get("*/admin/samples/series", ({ request }) => {
      const matching =
        new URL(request.url).searchParams.get("search") === "Core";
      return HttpResponse.json({ data: matching ? [SERIES] : [] });
    }),
  );
}

async function renderMember(
  defaultValues: Partial<CreateSample>,
  {
    parents = [],
    status = "published",
    storedSeries = null,
    readOnlyReason,
  }: {
    parents?: SampleFormParent[];
    status?: SampleStatus;
    storedSeries?: SampleSeries | null;
    readOnlyReason?: string;
  } = {},
) {
  fakeApi();
  const onSubmit = vi.fn<(value: CreateSample) => void>();
  const screen = await render(
    <SampleForm
      onCancel={noop}
      sampleId={MEMBER_ID}
      parents={parents}
      storedSeries={storedSeries}
      status={status}
      readOnlyReason={readOnlyReason}
      defaultValues={{ name: "Core A", type: "dredge", ...defaultValues }}
      primaryAction={{ kind: "submit", label: "Save", onSubmit }}
    />,
  );
  return Object.assign(screen, { onSubmit });
}

const seriesSection = (screen: Awaited<ReturnType<typeof renderMember>>) =>
  screen.getByRole("region", { name: "Series", exact: true });

const seriesPicker = (screen: Awaited<ReturnType<typeof renderMember>>) =>
  screen.getByRole("combobox", { name: "Series this sample belongs to" });

describe("SampleSeriesField", () => {
  it.each([
    { type: "serie_of_sample.core", parents: [] },
    { type: "dredge", parents: [PARENT] },
  ])(
    "should offer no series to a series or a sub-sample: $type with $parents.length parent",
    async ({ type, parents }) => {
      const screen = await renderMember({ type }, { parents });

      await expect.element(screen.getByLabelText("Name")).toBeVisible();
      await expect.element(seriesSection(screen)).not.toBeInTheDocument();
    },
  );

  it("should hint to publish a draft before picking its series", async () => {
    const screen = await renderMember({}, { status: "draft" });

    await expect
      .element(seriesSection(screen))
      .toHaveTextContent("Publish the sample before adding it to a series");
    await expect.element(seriesPicker(screen)).not.toBeInTheDocument();
  });

  it("should search the eligible series and submit the picked one", async () => {
    const screen = await renderMember({});

    await seriesPicker(screen).click();
    await screen.getByPlaceholder("Search by name or IGSN").fill("Core");
    await screen.getByRole("option", { name: /^Core series/ }).click();
    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(screen.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ seriesId: SERIES.id }),
      ),
    );
  });

  it("should name the stored series and leave it", async () => {
    const screen = await renderMember(
      { seriesId: STORED_SERIES.id },
      { storedSeries: STORED_SERIES },
    );

    await expect
      .element(seriesPicker(screen))
      .toHaveTextContent(STORED_SERIES.name);
    await seriesPicker(screen).click();
    await screen.getByRole("option", { name: "No series" }).click();
    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(screen.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ seriesId: null }),
      ),
    );
  });

  it("should hold the series read-only with the rest of the form", async () => {
    const screen = await renderMember(
      {},
      { readOnlyReason: "Another collaborator is editing this sample" },
    );

    await expect.element(seriesPicker(screen)).toBeDisabled();
  });
});
