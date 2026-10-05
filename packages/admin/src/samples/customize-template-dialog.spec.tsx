import { IMPORT_TEMPLATE_FILENAME } from "@projet-igsn/domain/sample/import/import-validator";
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

async function openDialog(initialValues?: TemplateDialogValues) {
  worker.use(
    http.get("*/admin/currentUser/attachable-manual-groups", () =>
      HttpResponse.json({ data: [GROUP] }),
    ),
  );
  const onBack = vi.fn();
  const screen = await render(
    <QueryClientProvider client={new QueryClient()}>
      <CustomizeTemplateDialog
        open
        onBack={onBack}
        initialValues={initialValues}
      />
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
  return {
    screen,
    dialog,
    onBack,
    pick,
    pickMaterial,
    download: dialog.getByRole("button", { name: "Download this template" }),
    reserve: dialog.getByRole("button", { name: "Reserve internal IDs" }),
  };
}

describe("CustomizeTemplateDialog", () => {
  it("should keep Download this template disabled until a provenance is chosen", async () => {
    const { download, pick } = await openDialog();
    await expect.element(download).toBeDisabled();

    await pick(/^Provenance status/, "Research project sample");

    await expect.element(download).toBeEnabled();
  });

  it("should keep Reserve internal IDs disabled until a provenance is chosen", async () => {
    const { reserve, pick } = await openDialog();
    await expect.element(reserve).toBeDisabled();

    await pick(/^Provenance status/, "Research project sample");

    await expect.element(reserve).toBeEnabled();
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

  it("should post the reserved count with the chosen material, group and provenance, save the answered template, then go back", async () => {
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
    const { screen, onBack, pick, pickMaterial, reserve } = await openDialog();
    await pickMaterial("Rock", "Igneous");
    await userEvent.keyboard("{Escape}");
    await pick("Manual group", GROUP.name);
    await pick(/^Provenance status/, "Research project sample");

    await reserve.click();
    const reserveDialog = screen.getByRole("dialog", {
      name: "Reserve internal IDs",
    });
    await reserveDialog.getByLabelText("Number of internal IDs").fill("3");
    await reserveDialog
      .getByRole("button", { name: "Download template with reserved IDs" })
      .click();

    await expect.poll(() => onBack.mock.calls.length).toBe(1);
    expect(posted).toEqual([
      {
        count: 3,
        provenanceStatus: "research_project_sample",
        materialPath: "rock_and_sediment.rock.igneous",
        manualGroupId: GROUP.id,
        subSamples: false,
        physicalDescription: true,
        age: true,
        conservationSecurity: true,
        repository: true,
        relatedDocuments: true,
        geologicalContext: true,
      },
    ]);
    expect(await (createObjectURL.mock.calls[0]![0] as Blob).text()).toBe(
      "reserved-bytes",
    );
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

  it("should ask for a template without the unchecked sections", async () => {
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
    const section = (name: string) =>
      dialog.getByRole("checkbox", { name, exact: true });
    for (const name of [
      "Physical description",
      "Age",
      "Conservation and security",
      "Curation and repository",
      "Related URL or document",
      "Geological context",
    ]) {
      await expect.element(section(name)).toBeChecked();
    }

    await section("Curation and repository").click();
    await section("Geological context").click();
    await download.click();

    await expect.poll(() => requested.length).toBe(1);
    expect(Object.fromEntries(requested[0]!)).toEqual({
      materialPath: "rock_and_sediment",
      provenanceStatus: "research_project_sample",
      repository: "false",
      geologicalContext: "false",
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
      sections: {
        physicalDescription: true,
        age: false,
        conservationSecurity: false,
        repository: true,
        relatedDocuments: false,
        geologicalContext: false,
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
      const { dialog, download } = await openDialog(PREFILLED);
      const checkbox = (name: string) =>
        dialog.getByRole("checkbox", { name, exact: true });
      await expect
        .element(checkbox("The file will contain sub-samples"))
        .toBeChecked();
      await expect.element(checkbox("Physical description")).toBeChecked();
      await expect.element(checkbox("Age")).not.toBeChecked();
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
        age: "false",
        conservationSecurity: "false",
        relatedDocuments: "false",
        geologicalContext: "false",
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
