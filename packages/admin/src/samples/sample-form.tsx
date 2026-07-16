import type { Sample } from "@projet-igsn/domain/sample/sample";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { composeHierarchyValue } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@projet-igsn/design-system/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { locationRequirement } from "@projet-igsn/domain/sample/location/location-requirement";
import { natureSchema } from "@projet-igsn/domain/sample/nature";
import { samplePublishBlockers } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { type CreateSample } from "@projet-igsn/domain/sample/sample";

import { m } from "#/paraglide/messages.js";
import { CollectionMethodField } from "#/samples/collection-method-field.tsx";
import { composeDescription } from "#/samples/compose-description.ts";
import { composeLocation } from "#/samples/compose-location.ts";
import { LocationFields } from "#/samples/location-fields.tsx";
import { MaterialField } from "#/samples/material-field.tsx";
import { MetamorphicFaciesField } from "#/samples/metamorphic-facies-field.tsx";
import { publishBlockerLabel } from "#/samples/publish-blocker-label.ts";
import { PublishSampleButton } from "#/samples/publish-sample-button.tsx";
import { SampleDescriptionFields } from "#/samples/sample-description-fields.tsx";
import { sampleDraftFieldErrors } from "#/samples/sample-draft-field-errors.ts";
import {
  type SampleDraft,
  sampleDraftSchema,
  toSampleDraft,
} from "#/samples/sample-draft-schema.ts";
import { natureLabel } from "#/samples/sample-labels.ts";
import { SampleTypeFields } from "#/samples/sample-type-fields.tsx";
import { TextureField } from "#/samples/texture-field.tsx";

const natureItems = natureSchema.options.map((nature) => ({
  value: nature,
  label: natureLabel(nature),
}));

// A footer button. `submit` saves; `publish` saves then publishes (with
// confirmation + a blocker tooltip); `link` navigates (e.g. the public page).
export type SampleFormAction =
  | { kind: "submit"; label: string; onSubmit: (value: CreateSample) => void }
  | { kind: "publish"; label: string; onPublish: (value: CreateSample) => void }
  | { kind: "link"; label: string; href: string };

type SampleFormProps = {
  onCancel: () => void;
  isPending?: boolean;
  defaultValues?: CreateSample;
  // Rendered accented; `secondaryAction`, when set, sits before it as outline.
  primaryAction: SampleFormAction;
  secondaryAction?: SampleFormAction;
};

const validate = ({ value }: { value: SampleDraft }) => {
  const parsed = sampleDraftSchema.safeParse(value);
  return parsed.success
    ? undefined
    : {
        fields: sampleDraftFieldErrors(
          parsed.error.issues,
          value.location.type,
          value.description.collectionDateMode,
        ),
      };
};

export function SampleForm({
  onCancel,
  isPending,
  defaultValues,
  primaryAction,
  secondaryAction,
}: SampleFormProps) {
  // Enter submits natively through the lone submit-kind button; route it to
  // that action (prefer primary). Publish and link never fire on Enter.
  const defaultSubmit =
    primaryAction.kind === "submit"
      ? primaryAction.onSubmit
      : secondaryAction?.kind === "submit"
        ? secondaryAction.onSubmit
        : undefined;

  const form = useAppForm({
    defaultValues: toSampleDraft(defaultValues),
    // The clicked button passes its callback as meta; Enter uses defaultSubmit.
    onSubmitMeta: { onValid: defaultSubmit } as {
      onValid: ((value: CreateSample) => void) | undefined;
    },
    // The domain schema (the one the API enforces) gates every submit and pins
    // its issues on the offending fields, so a rule the form has no dedicated
    // validator for still surfaces instead of silently blocking.
    validators: {
      onSubmit: validate,
      onChange: validate,
    },
    onSubmit: ({ value, meta, formApi }) => {
      const parsed = sampleDraftSchema.safeParse(value);
      // Unreachable: the onSubmit validator gates. Kept as a typed narrow.
      if (!parsed.success) return;
      meta.onValid?.(parsed.data);
      // Reset to what was submitted: leftovers the save dropped (a hidden
      // geometry's coordinates, the other region kind's leaf) must not
      // resurface when the user switches back after saving.
      formApi.reset(toSampleDraft(parsed.data));
    },
  });

  const renderAction = (action: SampleFormAction, variant?: "outline") => {
    if (action.kind === "link") {
      return (
        <Button asChild variant={variant}>
          <a href={action.href} target="_blank" rel="noopener noreferrer">
            {action.label}
          </a>
        </Button>
      );
    }
    if (action.kind === "publish") {
      // Gate on canSubmit (an invalid form would close the confirm dialog and
      // silently do nothing) and on the publish blockers, which the tooltip
      // lists so the disabled button explains itself. Save & Publish saves
      // first, so unsaved edits are not a blocker here.
      return (
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            typePath: state.values.typePath,
            materialPath: state.values.materialPath,
            metamorphicFacies: state.values.metamorphicFacies,
            location: state.values.location,
            description: state.values.description,
          })}
        >
          {({
            canSubmit,
            typePath,
            materialPath,
            metamorphicFacies,
            location,
            description,
          }) => {
            // Form state holds looser select strings; the runtime values match
            // the domain, so cast to the fields samplePublishBlockers reads.
            const reasons = samplePublishBlockers({
              type: composeHierarchyValue(typePath),
              material: composeHierarchyValue(materialPath),
              metamorphicFacies: metamorphicFacies || null,
              location: composeLocation(location),
              description: composeDescription(description),
            } as Pick<
              Sample,
              | "type"
              | "material"
              | "metamorphicFacies"
              | "location"
              | "description"
            >).map(publishBlockerLabel);
            const button = (
              <PublishSampleButton
                label={action.label}
                disabled={isPending || !canSubmit || reasons.length > 0}
                onPublish={() =>
                  void form.handleSubmit({ onValid: action.onPublish })
                }
              />
            );
            return reasons.length > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* The disabled button is not focusable, so the span carries
                      the tooltip: hover and keyboard both reveal the reason. */}
                  <span tabIndex={0}>{button}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{m.publish_blocked_title()}</p>
                  <ul className="list-disc ps-4">
                    {reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            ) : (
              button
            );
          }}
        </form.Subscribe>
      );
    }
    // ponytail: a native submit button routes through the form's default meta
    // (defaultSubmit), so only one submit-kind action is supported at a time.
    // No caller needs two; add explicit per-button meta if that ever changes.
    return (
      <form.AppForm>
        <form.SubmitButton
          label={action.label}
          variant={variant}
          disabled={isPending}
        />
      </form.AppForm>
    );
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-6"
    >
      <Tabs defaultValue="classification">
        <TabsList>
          <TabsTrigger value="classification">
            {m.tab_sample_classification()}
          </TabsTrigger>
          <TabsTrigger value="type">{m.tab_sample_type()}</TabsTrigger>
          {/* Synthetic samples must not carry a location (ADR 0014), so the tab
              is hidden for them; it stays for optional and required materials. */}
          <form.Subscribe
            selector={(state) =>
              locationRequirement(
                composeHierarchyValue(state.values.materialPath),
              ) !== "forbidden"
            }
          >
            {(showLocation) =>
              showLocation ? (
                <TabsTrigger value="location">
                  {m.tab_sample_location()}
                </TabsTrigger>
              ) : null
            }
          </form.Subscribe>
          <TabsTrigger value="description">
            {m.tab_sample_description()}
          </TabsTrigger>
        </TabsList>

        {/* Values live in the form store, not the field components, so a field
            unmounting when its tab hides never drops what the user entered. */}
        <TabsContent value="classification" className="grid gap-4">
          <form.AppField
            name="name"
            validators={{
              onChange: ({ value }) =>
                value?.trim()
                  ? undefined
                  : { message: m.field_name_required() },
            }}
          >
            {(field) => <field.TextField label={`${m.field_name()} *`} />}
          </form.AppField>

          <form.AppForm>
            <SampleTypeFields />
          </form.AppForm>

          <form.AppField
            name="nature"
            validators={{
              onChange: ({ value }) =>
                value ? undefined : { message: m.field_nature_required() },
            }}
          >
            {(field) => (
              <field.ComboboxField
                label={`${m.field_nature()} *`}
                items={natureItems}
                placeholder={m.nature_placeholder()}
                searchPlaceholder={m.nature_search_placeholder()}
                emptyText={m.nature_empty()}
              />
            )}
          </form.AppField>

          <form.AppForm>
            <CollectionMethodField />
          </form.AppForm>

          <form.AppField name="collectionMethodDescription">
            {(field) => (
              <field.TextField
                label={m.field_collection_method_description()}
                multiline
              />
            )}
          </form.AppField>
        </TabsContent>

        <TabsContent value="type" className="grid gap-4">
          <section className="grid gap-4">
            <h2 className="text-lg font-semibold">{m.section_material()}</h2>
            <form.AppForm>
              <MaterialField />
            </form.AppForm>
            <form.AppForm>
              <TextureField />
            </form.AppForm>
            <form.AppForm>
              <MetamorphicFaciesField />
            </form.AppForm>
          </section>

          <form.AppField name="specificName">
            {(field) => <field.TextField label={m.field_specific_name()} />}
          </form.AppField>
        </TabsContent>

        <TabsContent value="location" className="grid gap-4">
          <form.AppForm>
            <LocationFields />
          </form.AppForm>
        </TabsContent>

        <TabsContent value="description" className="grid gap-4">
          <form.AppForm>
            <SampleDescriptionFields />
          </form.AppForm>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {m.action_cancel()}
        </Button>
        {secondaryAction ? renderAction(secondaryAction, "outline") : null}
        {renderAction(primaryAction)}
      </div>
    </form>
  );
}
