import type {
  CreateSample,
  SampleStatus,
} from "@projet-igsn/domain/sample/sample";

import { TooltipProvider } from "@projet-igsn/design-system/components/ui/tooltip";
import { HttpResponse, http } from "msw";
import { vi } from "vitest";

import { FREE_TEXT_ACTION } from "../../test/fill-person-name.ts";
import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

const WEGENER = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c33f7",
  email: "alfred.wegener@awi.de",
  firstname: "Alfred",
  name: "Wegener",
  orcid: null,
};

const IDENTITY = {
  name: "Basalte du Massif Central",
  nature: "thin_section",
  type: null,
  material: null,
  collectionMethod: null,
  collectionMethodDescription: null,
} satisfies Partial<CreateSample>;

async function renderCollector({
  defaultValues,
  onSubmit = noop,
  status,
}: {
  defaultValues?: Partial<CreateSample>;
  onSubmit?: (value: CreateSample) => void;
  status?: SampleStatus;
} = {}) {
  worker.use(
    http.get("*/admin/users/search", () =>
      HttpResponse.json({ data: [WEGENER] }),
    ),
  );
  const screen = await render(
    <TooltipProvider>
      <SampleForm
        onCancel={noop}
        status={status}
        defaultValues={{ ...IDENTITY, ...defaultValues }}
        primaryAction={{ kind: "submit", label: "Save", onSubmit }}
      />
    </TooltipProvider>,
  );
  await screen.getByRole("tab", { name: "Scientific context" }).click();
  return screen;
}

type Screen = Awaited<ReturnType<typeof renderCollector>>;

const collector = (screen: Screen) =>
  screen.getByRole("group", { name: "Collector name" });

const openCollectorPicker = async (screen: Screen) => {
  await collector(screen)
    .getByRole("combobox", { name: "Collector name" })
    .click();
};

const firstname = (screen: Screen) =>
  collector(screen).getByRole("textbox", { name: /first name/i });

describe("ContactNameFields", () => {
  it("should record the picked account and hide the typed name inputs", async () => {
    const onSubmit = vi.fn();
    const screen = await renderCollector({ onSubmit });

    await openCollectorPicker(screen);
    await screen.getByRole("option", { name: "Alfred Wegener" }).click();

    await expect.element(firstname(screen)).not.toBeInTheDocument();

    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          scientificContext: {
            provenanceStatus: "field_sample",
            additionalRoles: [],
            collectorUserId: WEGENER.id,
          },
        }),
      ),
    );
  });

  it("should drop the link and reveal the three typed inputs under the free-text item", async () => {
    const onSubmit = vi.fn();
    const screen = await renderCollector({ onSubmit });

    await openCollectorPicker(screen);
    await screen.getByRole("option", { name: "Alfred Wegener" }).click();
    await openCollectorPicker(screen);
    await screen.getByRole("option", { name: FREE_TEXT_ACTION }).click();

    await expect.element(firstname(screen)).toHaveValue("");
    await firstname(screen).fill("Pierre");
    await collector(screen)
      .getByRole("textbox", { name: /last name/i })
      .fill("Curie");
    await collector(screen)
      .getByRole("textbox", { name: "ORCID iD" })
      .fill("0000-0002-1825-0097");
    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          scientificContext: {
            provenanceStatus: "field_sample",
            additionalRoles: [],
            collectorFirstname: "Pierre",
            collectorLastname: "Curie",
            collectorOrcid: "0000-0002-1825-0097",
          },
        }),
      ),
    );
  });

  it("should open in free-text mode when the sample carries a typed name and no link", async () => {
    const screen = await renderCollector({
      defaultValues: {
        scientificContext: {
          provenanceStatus: "field_sample",
          additionalRoles: [],
          collectorFirstname: "Alfred",
          collectorLastname: "Wegener",
        },
      },
    });

    await expect.element(firstname(screen)).toHaveValue("Alfred");
  });

  it("should show the linked account on the picker trigger", async () => {
    const screen = await renderCollector({
      defaultValues: {
        scientificContext: {
          provenanceStatus: "field_sample",
          additionalRoles: [],
          collectorUserId: WEGENER.id,
        },
      },
    });

    await expect
      .element(
        collector(screen).getByRole("combobox", { name: "Collector name" }),
      )
      .toHaveTextContent("Alfred Wegener");
  });

  it("should hide the picker in free-text mode and swap the typed name for a picked account", async () => {
    const onSubmit = vi.fn();
    const screen = await renderCollector({
      onSubmit,
      defaultValues: {
        scientificContext: {
          provenanceStatus: "field_sample",
          additionalRoles: [],
          collectorFirstname: "Pierre",
          collectorLastname: "Curie",
          collectorOrcid: "0000-0002-1825-0097",
        },
      },
    });

    await expect
      .element(collector(screen).getByRole("combobox"))
      .not.toBeInTheDocument();

    await collector(screen)
      .getByRole("button", { name: "Search for a person instead" })
      .click();

    await expect.element(firstname(screen)).not.toBeInTheDocument();

    await openCollectorPicker(screen);
    await screen.getByRole("option", { name: "Alfred Wegener" }).click();

    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          scientificContext: {
            provenanceStatus: "field_sample",
            additionalRoles: [],
            collectorUserId: WEGENER.id,
          },
        }),
      ),
    );
  });

  it("should mark a person required to publish in link mode", async () => {
    const screen = await renderCollector();

    await expect
      .element(screen.getByRole("group", { name: "Collector name *" }))
      .toBeVisible();
  });

  it("should render a frozen person disabled, with no picker and no mode switch", async () => {
    const screen = await renderCollector({
      status: "published",
      defaultValues: {
        scientificContext: {
          provenanceStatus: "field_sample",
          additionalRoles: [],
          collectorFirstname: "Alfred",
          collectorLastname: "Wegener",
        },
      },
    });

    await expect.element(firstname(screen)).toBeDisabled();
    await expect
      .element(collector(screen).getByRole("combobox"))
      .not.toBeInTheDocument();
    await expect
      .element(collector(screen).getByRole("button"))
      .not.toBeInTheDocument();
    await expect
      .element(
        screen
          .getByRole("group", { name: "Chief scientist / Project leader" })
          .getByRole("combobox"),
      )
      .toBeVisible();
  });
});
