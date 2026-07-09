import type { Nature } from "@projet-igsn/domain/sample/nature";
import type { Sample } from "@projet-igsn/domain/sample/sample";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import {
  composeHierarchyValue,
  toHierarchyPath,
} from "@projet-igsn/design-system/components/form/hierarchy-select-field";
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
import { isSampleTypeLeaf } from "@projet-igsn/domain/sample/is-sample-type-leaf";
import { natureSchema } from "@projet-igsn/domain/sample/nature";
import {
  type CreateSample,
  createSampleSchema,
} from "@projet-igsn/domain/sample/sample";
import { samplePublishBlockers } from "@projet-igsn/domain/sample/sample-publish-blockers";
import { type SampleType } from "@projet-igsn/domain/sample/type";
import { z } from "zod";

import { m } from "#/paraglide/messages.js";
import { CollectionMethodField } from "#/samples/collection-method-field.tsx";
import { MaterialPathField } from "#/samples/material-path-field.tsx";
import { natureLabel } from "#/samples/nature-label.ts";
import { publishBlockerLabel } from "#/samples/publish-blocker-label.ts";
import { PublishSampleButton } from "#/samples/publish-sample-button.tsx";
import { SampleTypeFields } from "#/samples/sample-type-fields.tsx";

const natureItems = natureSchema.options.map((nature) => ({
  value: nature,
  label: natureLabel(nature),
}));

// Form-level rule: "core" is the only root type with sub-values, and a bare
// "core" is too vague to keep. Once it (or any non-leaf) is picked, a specific
// sub-type is required. Read at form level so it sees the whole walk; the issue
// targets the level below the composed path, the select missing a refinement.
export const sampleTypeFormSchema = z
  .object({ typePath: z.array(z.string()) })
  .superRefine((value, ctx) => {
    const type = composeHierarchyValue(value.typePath);
    if (type && !isSampleTypeLeaf(type as SampleType)) {
      ctx.addIssue({
        code: "custom",
        path: ["typePath", type.split(".").length],
        message: m.field_sub_type_required(),
      });
    }
  });

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
    defaultValues: {
      name: defaultValues?.name ?? "",
      nature: defaultValues?.nature ?? ("" as Nature | ""),
      typePath: toHierarchyPath(defaultValues?.type ?? null),
      // Empty-string sentinel <-> null: the cascade works in strings, the
      // domain schema in `MaterialPath | null`.
      material: defaultValues?.material ?? "",
      collectionMethodPath: toHierarchyPath(
        defaultValues?.collectionMethod ?? null,
      ),
      specificName: defaultValues?.specificName ?? "",
    },
    // Wrap the superRefine schema in a function so it is typed against the
    // whole form value; forward its issue to the level field it targets.
    validators: {
      onChange: ({ value }) => {
        const issue = sampleTypeFormSchema.safeParse(value).error?.issues[0];
        // Field components read `error.message`, so wrap the string to match.
        return issue
          ? {
              fields: {
                [`typePath[${String(issue.path[1])}]`]: {
                  message: issue.message,
                },
              },
            }
          : undefined;
      },
    },
    // The clicked button passes its callback as meta; Enter uses defaultSubmit.
    onSubmitMeta: { onValid: defaultSubmit } as {
      onValid: ((value: CreateSample) => void) | undefined;
    },
    onSubmit: ({ value, meta }) => {
      // The API is the real trust boundary; re-parse before sending.
      const parsed = createSampleSchema.safeParse({
        name: value.name,
        nature: value.nature,
        type: composeHierarchyValue(value.typePath),
        material: value.material || null,
        collectionMethod: composeHierarchyValue(value.collectionMethodPath),
        specificName: value.specificName.trim() || null,
      });
      if (!parsed.success) return;
      meta.onValid?.(parsed.data);
    },
  });

  const renderAction = (action: SampleFormAction, variant?: "outline") => {
    if (action.kind === "link") {
      return (
        <Button asChild variant={variant}>
          <a href={action.href}>{action.label}</a>
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
            material: state.values.material,
            specificName: state.values.specificName,
          })}
        >
          {({ canSubmit, typePath, material, specificName }) => {
            // Form state holds looser select strings; the runtime values match
            // the domain, so cast to the fields samplePublishBlockers reads.
            const reasons = samplePublishBlockers({
              type: composeHierarchyValue(typePath),
              material: material || null,
              specificName: specificName.trim() || null,
            } as Pick<Sample, "type" | "material" | "specificName">).map(
              publishBlockerLabel,
            );
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
        </TabsList>

        {/* Values live in the form store, not the field components, so a field
            unmounting when its tab hides never drops what the user entered. */}
        <TabsContent value="classification" className="grid gap-4">
          <form.AppField
            name="name"
            validators={{
              onChange: ({ value }) =>
                value.trim() ? undefined : { message: m.field_name_required() },
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
        </TabsContent>

        <TabsContent value="type" className="grid gap-4">
          <section className="grid gap-4">
            <h2 className="text-lg font-semibold">{m.section_material()}</h2>
            <form.AppField name="material">
              {(field) => (
                <MaterialPathField
                  value={field.state.value}
                  onChange={(path) => field.handleChange(path)}
                />
              )}
            </form.AppField>
          </section>

          <form.AppField name="specificName">
            {(field) => <field.TextField label={m.field_specific_name()} />}
          </form.AppField>
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
