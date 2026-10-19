import { TooltipProvider } from "@projet-igsn/design-system/components/ui/tooltip";
import { IMPORT_TEMPLATE_FILENAME } from "@projet-igsn/domain/sample/import/import-validator";
import {
  TEMPLATE_FIELD_KEYS,
  type TemplateFieldKey,
} from "@projet-igsn/domain/sample/import/template-fields";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";

import { worker } from "../../test/msw.ts";
import {
  CustomizeTemplateDialog,
  type TemplateDialogValues,
} from "./customize-template-dialog.tsx";

const GROUP = { id: "0f8fad5b-d9cb-469f-a165-70867728950e", name: "Alps team" };

const ALL_FIELDS = Object.fromEntries(
  TEMPLATE_FIELD_KEYS.map((key) => [key, true]),
) as Record<TemplateFieldKey, boolean>;

const PHYSICAL_DESCRIPTION_FIELDS = [
  "Open description",
  "Length",
  "Width",
  "Thickness",
  "Mass",
  "Volume",
  "Oriented sample",
];

const AGE_FIELDS = [
  "Numeric age",
  "Geological age time scale",
  "Geological unit",
];

async function openDialog(initialValues?: TemplateDialogValues) {
  worker.use(
    http.get("*/admin/currentUser/attachable-manual-groups", () =>
      HttpResponse.json({ data: [GROUP] }),
    ),
  );
  const onBack = vi.fn();
  const screen = await render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <CustomizeTemplateDialog
          open
          onBack={onBack}
          initialValues={initialValues}
        />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  const dialog = screen.getByRole("dialog", { name: "Customize the template" });
  const pick = async (combobox: RegExp | string, option: string) => {
    await dialog.getByRole("combobox", { name: combobox, exact: true }).click();
    await screen.getByRole("option", { name: option, exact: true }).click();
  };
  const pickMaterial = async (...levels: string[]) => {
    await dialog
      .getByRole("combobox", { name: "Material", exact: true })
      .click();
    for (const level of levels) {
      await screen.getByRole("option", { name: level, exact: true }).click();
    }
  };
  const checkbox = (name: string) =>
    dialog.getByRole("checkbox", { name, exact: true });
  const openSection = (name: string) =>
    dialog.getByRole("button", { name, exact: true }).click();
  return {
    screen,
    dialog,
    onBack,
    pick,
    pickMaterial,
    checkbox,
    openSection,
    download: dialog.getByRole("button", { name: "Download this template" }),
    reserve: dialog.getByRole("checkbox", { name: "Reserve internal IDs" }),
    count: dialog.getByRole("spinbutton", { name: "Number of internal IDs" }),
  };
}

describe("CustomizeTemplateDialog", () => {
  it("should keep Download this template disabled until a provenance is chosen", async () => {
    const { download, pick } = await openDialog();
    await expect.element(download).toBeDisabled();

    await pick(/^Provenance status/, "Research project sample");

    await expect.element(download).toBeEnabled();
  });

  it.each(["Mineral", "Synthetic rock / mineral"])(
    "should refuse the mass import of %s",
    async (material) => {
      const { dialog, download, pick, pickMaterial } = await openDialog();
      await pick(/^Provenance status/, "Research project sample");

      await pickMaterial(material);

      await expect
        .element(dialog.getByRole("alert"))
        .toHaveTextContent(
          `Mass import of ${material} samples is not possible.`,
        );
      await expect.element(download).toBeDisabled();
    },
  );

  it("should download the template customized with the chosen material, group and provenance, then go back", async () => {
    const requested: URLSearchParams[] = [];
    worker.use(
      http.get("*/admin/samples/import-template", ({ request }) => {
        requested.push(new URL(request.url).searchParams);
        return new HttpResponse("customized-bytes");
      }),
    );
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test");
    const savedNames: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function (this: HTMLAnchorElement) {
        savedNames.push(this.download);
      },
    );
    const { download, onBack, pick, pickMaterial } = await openDialog();
    await pickMaterial("Rock", "Igneous");
    await userEvent.keyboard("{Escape}");
    await pick("Manual group", GROUP.name);
    await pick(/^Provenance status/, "Research project sample");

    await download.click();

    await expect.poll(() => onBack.mock.calls.length).toBe(1);
    expect(Object.fromEntries(requested[0]!)).toEqual({
      materialPath: "rock_and_sediment.rock.igneous",
      manualGroupId: GROUP.id,
      provenanceStatus: "research_project_sample",
    });
    expect(savedNames).toEqual([IMPORT_TEMPLATE_FILENAME]);
    expect(await (createObjectURL.mock.calls[0]![0] as Blob).text()).toBe(
      "customized-bytes",
    );
  });

  it("should reveal the count once Reserve internal IDs is checked, posting it with the chosen material, group and provenance, then go back", async () => {
    const posted: unknown[] = [];
    worker.use(
      http.post(
        "*/admin/samples/import-template/reservation",
        async ({ request }) => {
          posted.push(await request.json());
          return new HttpResponse("reserved-bytes");
        },
      ),
    );
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const { count, download, onBack, pick, pickMaterial, reserve } =
      await openDialog();
    await pickMaterial("Rock", "Igneous");
    await userEvent.keyboard("{Escape}");
    await pick("Manual group", GROUP.name);
    await pick(/^Provenance status/, "Research project sample");
    await expect.element(count).not.toBeInTheDocument();

    await reserve.click();
    await expect.element(count).toHaveValue(250);
    await count.fill("3");
    await download.click();

    await expect.poll(() => onBack.mock.calls.length).toBe(1);
    expect(posted).toEqual([
      {
        count: 3,
        provenanceStatus: "research_project_sample",
        materialPath: "rock_and_sediment.rock.igneous",
        manualGroupId: GROUP.id,
        subSamples: false,
        ...ALL_FIELDS,
      },
    ]);
    expect(await (createObjectURL.mock.calls[0]![0] as Blob).text()).toBe(
      "reserved-bytes",
    );
  });

  it.each(["0", ""])(
    "should refuse the reserved count %j inline, Download disabled",
    async (typed) => {
      const { count, dialog, download, pick, reserve } = await openDialog();
      await pick(/^Provenance status/, "Research project sample");

      await reserve.click();
      await count.fill(typed);

      await expect
        .element(dialog.getByRole("alert"))
        .toHaveTextContent("Enter a number from 1 to 500.");
      await expect.element(download).toBeDisabled();
    },
  );

  it("should drop the reservation once unchecked, downloading without it and restoring the count on re-check", async () => {
    const requested: string[] = [];
    worker.use(
      http.get("*/admin/samples/import-template", ({ request }) => {
        requested.push(request.method);
        return new HttpResponse("customized-bytes");
      }),
      http.post(
        "*/admin/samples/import-template/reservation",
        ({ request }) => {
          requested.push(request.method);
          return new HttpResponse("reserved-bytes");
        },
      ),
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const { count, download, onBack, pick, reserve } = await openDialog();
    await pick(/^Provenance status/, "Research project sample");
    await reserve.click();
    await count.fill("3");

    await reserve.click();
    await expect.element(count).not.toBeInTheDocument();
    await download.click();

    await expect.poll(() => onBack.mock.calls.length).toBe(1);
    expect(requested).toEqual(["GET"]);
    await reserve.click();
    await expect.element(count).toHaveValue(3);
  });

  it("should download the template with the root material when it is left untouched", async () => {
    const requested: URLSearchParams[] = [];
    worker.use(
      http.get("*/admin/samples/import-template", ({ request }) => {
        requested.push(new URL(request.url).searchParams);
        return new HttpResponse("customized-bytes");
      }),
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const { download, pick } = await openDialog();
    await pick(/^Provenance status/, "Research project sample");

    await download.click();

    await expect.poll(() => requested.length).toBe(1);
    expect(Object.fromEntries(requested[0]!)).toEqual({
      materialPath: "rock_and_sediment",
      provenanceStatus: "research_project_sample",
    });
  });

  it("should ask for the sub-samples template when the sub-samples box is checked", async () => {
    const requested: URLSearchParams[] = [];
    worker.use(
      http.get("*/admin/samples/import-template", ({ request }) => {
        requested.push(new URL(request.url).searchParams);
        return new HttpResponse("customized-bytes");
      }),
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const { dialog, download, pick } = await openDialog();
    await pick(/^Provenance status/, "Research project sample");

    await dialog
      .getByRole("checkbox", { name: "The file will contain sub-samples" })
      .click();
    await download.click();

    await expect.poll(() => requested.length).toBe(1);
    expect(Object.fromEntries(requested[0]!)).toEqual({
      materialPath: "rock_and_sediment",
      provenanceStatus: "research_project_sample",
      subSamples: "true",
    });
  });

  it("should set every field of a section to its Include checkbox", async () => {
    const { checkbox, openSection } = await openDialog();
    await openSection("Physical description");

    await checkbox("Include Physical description").click();
    for (const name of PHYSICAL_DESCRIPTION_FIELDS) {
      await expect.element(checkbox(name)).not.toBeChecked();
    }

    await checkbox("Include Physical description").click();
    for (const name of PHYSICAL_DESCRIPTION_FIELDS) {
      await expect.element(checkbox(name)).toBeChecked();
    }
  });

  it.each([
    ["Identity", "Local name"],
    ["Sample classification", "Texture"],
    ["Location", "Locality name"],
    ["Scientific context", "Funding"],
  ])(
    "should disable the Include checkbox of %s, explaining it holds mandatory fields, and follow its fields such as %s",
    async (section, field) => {
      const { checkbox, openSection, screen } = await openDialog();
      const sectionCheckbox = checkbox(`Include ${section}`);
      await openSection(section);
      await expect.element(sectionCheckbox).toBeDisabled();
      await expect.element(sectionCheckbox).toBeChecked();

      await checkbox(field).click();
      await expect.element(sectionCheckbox).toBePartiallyChecked();
      await sectionCheckbox.hover();
      await expect
        .element(screen.getByRole("tooltip"))
        .toHaveTextContent(
          "This section holds mandatory fields, so it cannot be excluded.",
        );
    },
  );

  it("should show a section partially checked while its fields differ, and follow them once aligned", async () => {
    const { checkbox, openSection } = await openDialog();
    const section = checkbox("Include Age");
    await openSection("Age");

    await checkbox("Numeric age").click();
    await expect.element(section).toBePartiallyChecked();

    for (const name of AGE_FIELDS.slice(1)) await checkbox(name).click();
    await expect.element(section).not.toBeChecked();
    await expect.element(section).not.toBePartiallyChecked();

    for (const name of AGE_FIELDS) await checkbox(name).click();
    await expect.element(section).toBeChecked();
  });

  it.each([
    [
      "Research project sample",
      "Identity",
      "Collection date",
      "collectionDate",
      false,
    ],
    ["Research project sample", "Location", "Position", "position", false],
    [
      "Research project sample",
      "Scientific context",
      "Collector name",
      "collector",
      false,
    ],
    [
      "Collection specimen",
      "Scientific context",
      "Collection origin",
      "collectionOrigin",
      false,
    ],
    [
      "Research project sample",
      "Identity",
      "Manual groups",
      "manualGroup",
      true,
    ],
  ])(
    "should lock in a %s template the %s field %s the template relies on",
    async (provenance, section, field, key, picksGroup) => {
      const requested: URLSearchParams[] = [];
      worker.use(
        http.get("*/admin/samples/import-template", ({ request }) => {
          requested.push(new URL(request.url).searchParams);
          return new HttpResponse("customized-bytes");
        }),
      );
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
        () => {},
      );
      const { checkbox, download, openSection, pick } = await openDialog();
      await openSection(section);
      await checkbox(field).click();

      await pick(/^Provenance status/, provenance);
      if (picksGroup) await pick("Manual group", GROUP.name);
      await expect.element(checkbox(field)).toBeChecked();
      await expect.element(checkbox(field)).toBeDisabled();
      await download.click();

      await expect.poll(() => requested.length).toBe(1);
      expect(requested[0]!.has(key)).toBe(false);
    },
  );

  it("should ask for a template without the unchecked fields", async () => {
    const requested: URLSearchParams[] = [];
    worker.use(
      http.get("*/admin/samples/import-template", ({ request }) => {
        requested.push(new URL(request.url).searchParams);
        return new HttpResponse("customized-bytes");
      }),
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const { checkbox, download, openSection, pick } = await openDialog();
    await pick(/^Provenance status/, "Research project sample");

    await checkbox("Include Geological context").click();
    await openSection("Physical description");
    await checkbox("Length").click();
    await download.click();

    await expect.poll(() => requested.length).toBe(1);
    expect(Object.fromEntries(requested[0]!)).toEqual({
      materialPath: "rock_and_sediment",
      provenanceStatus: "research_project_sample",
      geologicalContextDescription: "false",
      physiographicEnvironment: "false",
      length: "false",
    });
  });

  describe("prefilled from a sample", () => {
    const PREFILLED: TemplateDialogValues = {
      materialPath: [
        "rock_and_sediment",
        "rock_and_sediment.rock",
        "rock_and_sediment.rock.igneous",
      ],
      groupId: GROUP.id,
      provenanceValue: "research_project_sample",
      subSamples: true,
      fields: {
        ...ALL_FIELDS,
        numericAge: false,
        geologicalAge: false,
        geologicalUnit: false,
        length: false,
      },
    };

    const captureDownload = () => {
      const requested: URLSearchParams[] = [];
      worker.use(
        http.get("*/admin/samples/import-template", ({ request }) => {
          requested.push(new URL(request.url).searchParams);
          return new HttpResponse("customized-bytes");
        }),
      );
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
        () => {},
      );
      return requested;
    };

    it("should show the prefilled choices and download the template they describe", async () => {
      const requested = captureDownload();
      const { checkbox, dialog, download } = await openDialog(PREFILLED);
      await expect
        .element(checkbox("The file will contain sub-samples"))
        .toBeChecked();
      await expect
        .element(checkbox("Include Physical description"))
        .toBePartiallyChecked();
      await expect.element(checkbox("Include Age")).not.toBeChecked();
      await expect
        .element(dialog.getByRole("combobox", { name: "Manual group" }))
        .toHaveTextContent(GROUP.name);

      await download.click();

      await expect.poll(() => requested.length).toBe(1);
      expect(Object.fromEntries(requested[0]!)).toEqual({
        materialPath: "rock_and_sediment.rock.igneous",
        manualGroupId: GROUP.id,
        provenanceStatus: "research_project_sample",
        subSamples: "true",
        numericAge: "false",
        geologicalAge: "false",
        geologicalUnit: "false",
        length: "false",
      });
    });

    it("should send no manual group the caller cannot attach", async () => {
      const requested = captureDownload();
      const { screen, dialog, download } = await openDialog({
        ...PREFILLED,
        groupId: "3f2504e0-4f89-41d3-9a0c-0305000000ff",
      });
      await dialog.getByRole("combobox", { name: "Manual group" }).click();
      await expect
        .element(screen.getByRole("option", { name: GROUP.name }))
        .toBeVisible();
      await userEvent.keyboard("{Escape}");

      await download.click();

      await expect.poll(() => requested.length).toBe(1);
      expect(requested[0]!.has("manualGroupId")).toBe(false);
    });
  });
});
