import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";
import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Trash2 } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { type LinkDraft } from "#/samples/sample-draft-schema.ts";

// Render inside a `form.AppForm`.
export function SampleLinksFields() {
  const form = useTypedAppFormContext({
    defaultValues: {} as { links: LinkDraft[] },
  });
  // Buttons, not fields, so they ask the form's rule for the field they edit
  // (same escape hatch as the collection-date mode switch).
  const isDisabled = useIsFieldDisabled("links");
  return (
    <FormSection title={m.section_doi_links()}>
      <form.Subscribe selector={(state) => state.values.links}>
        {(links) =>
          links.map((link, index) => (
            <div key={link.key} className="grid gap-2">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <form.AppField name={`links[${index}].url`}>
                    {(field) => (
                      <field.TextField
                        label={m.field_doi_url({ index: index + 1 })}
                      />
                    )}
                  </form.AppField>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  // Label height (text-sm leading-none) + the field's gap-2:
                  // lines the icon up with the input, error text or not.
                  className="mt-[22px]"
                  disabled={isDisabled}
                  aria-label={m.action_remove_link({ index: index + 1 })}
                  onClick={() => form.removeFieldValue("links", index)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <form.AppField name={`links[${index}].description`}>
                {(field) => (
                  <field.TextField
                    label={m.field_link_description({ index: index + 1 })}
                    multiline
                  />
                )}
              </form.AppField>
            </div>
          ))
        }
      </form.Subscribe>
      {isDisabled ? null : (
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              form.pushFieldValue("links", {
                key: crypto.randomUUID(),
                url: "",
                description: "",
              })
            }
          >
            {m.action_add_link()}
          </Button>
        </div>
      )}
    </FormSection>
  );
}
