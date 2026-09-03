import type { IdentifierType } from "@projet-igsn/domain/sample/relation/identifier-type";

import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import {
  IDENTIFIER_TYPES,
  identifierTypeLabel,
} from "@projet-igsn/domain/sample/relation/identifier-type";
import {
  hasMetadataScheme,
  RELATION_TYPES,
} from "@projet-igsn/domain/sample/relation/relation-type";
import { RELATION_TARGET_RESOURCE_TYPES } from "@projet-igsn/domain/sample/relation/target-resource-type";
import { Trash2 } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { EMPTY_RELATION_DRAFT } from "#/samples/sample-draft-schema.ts";
import {
  relationTargetResourceTypeLabel,
  relationTypeLabel,
} from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const relationTypeItems = toComboboxItems(RELATION_TYPES, relationTypeLabel);

const identifierTypeItems = toComboboxItems(
  IDENTIFIER_TYPES,
  (value) => identifierTypeLabel[value],
);

const IDENTIFIER_PLACEHOLDER: Partial<
  Record<IdentifierType | "", () => string>
> = {
  doi: m.identifier_placeholder_doi,
  igsn: m.identifier_placeholder_igsn,
  url: m.identifier_placeholder_url,
};

const resourceTypeItems = toComboboxItems(
  RELATION_TARGET_RESOURCE_TYPES,
  relationTargetResourceTypeLabel,
);

export function SampleRelationsFields() {
  const form = useSampleForm();
  const isDisabled = useIsFieldDisabled("relations");
  return (
    <FormSection title={m.section_relations()}>
      <form.Subscribe selector={(state) => state.values.relations}>
        {(relations) =>
          relations.map((relation, index) => (
            <fieldset
              key={relation.key}
              className="grid gap-2 rounded-lg border p-4"
            >
              <legend className="px-1 text-sm font-medium">
                {m.legend_relation({ index: index + 1 })}
              </legend>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <form.AppField name={`relations[${index}].targetTitle`}>
                    {(field) => (
                      <field.TextField
                        label={m.field_relation_target_title()}
                        requiredToPublish
                      />
                    )}
                  </form.AppField>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isDisabled}
                  aria-label={m.action_remove_relation({ index: index + 1 })}
                  onClick={() => form.removeFieldValue("relations", index)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <form.AppField name={`relations[${index}].relationType`}>
                {(field) => (
                  <field.ComboboxField
                    label={m.field_relation_type()}
                    requiredToPublish
                    items={relationTypeItems}
                    placeholder={m.relation_type_placeholder()}
                    searchPlaceholder={m.relation_type_search_placeholder()}
                    emptyText={m.relation_type_empty()}
                  />
                )}
              </form.AppField>
              <form.AppField name={`relations[${index}].identifierType`}>
                {(field) => (
                  <field.ComboboxField
                    label={m.field_relation_identifier_type()}
                    requiredToPublish
                    items={identifierTypeItems}
                    placeholder={m.identifier_type_placeholder()}
                    searchPlaceholder={m.identifier_type_search_placeholder()}
                    emptyText={m.identifier_type_empty()}
                  />
                )}
              </form.AppField>
              <form.AppField name={`relations[${index}].identifier`}>
                {(field) => (
                  <field.TextField
                    label={m.field_relation_identifier()}
                    requiredToPublish
                    placeholder={IDENTIFIER_PLACEHOLDER[
                      relation.identifierType
                    ]?.()}
                  />
                )}
              </form.AppField>
              <form.AppField name={`relations[${index}].targetResourceType`}>
                {(field) => (
                  <field.ComboboxField
                    label={m.field_relation_target_resource_type()}
                    items={resourceTypeItems}
                    placeholder={m.relation_resource_type_placeholder()}
                    searchPlaceholder={m.relation_resource_type_search_placeholder()}
                    emptyText={m.relation_resource_type_empty()}
                  />
                )}
              </form.AppField>
              <form.AppField
                name={`relations[${index}].relationTypeInformation`}
              >
                {(field) => (
                  <field.TextField
                    label={m.field_relation_type_information()}
                  />
                )}
              </form.AppField>
              <form.Subscribe
                selector={(state) =>
                  state.values.relations[index]?.relationType ?? ""
                }
              >
                {(relationType) =>
                  hasMetadataScheme(relationType) ? (
                    <>
                      <form.AppField
                        name={`relations[${index}].relatedMetadataScheme`}
                      >
                        {(field) => (
                          <field.TextField
                            label={m.field_relation_metadata_scheme()}
                          />
                        )}
                      </form.AppField>
                      <form.AppField name={`relations[${index}].schemeURI`}>
                        {(field) => (
                          <field.TextField
                            label={m.field_relation_scheme_uri()}
                          />
                        )}
                      </form.AppField>
                      <form.AppField name={`relations[${index}].schemeType`}>
                        {(field) => (
                          <field.TextField
                            label={m.field_relation_scheme_type()}
                          />
                        )}
                      </form.AppField>
                    </>
                  ) : null
                }
              </form.Subscribe>
              <form.AppField name={`relations[${index}].description`}>
                {(field) => (
                  <field.TextField
                    label={m.field_relation_description()}
                    multiline
                  />
                )}
              </form.AppField>
            </fieldset>
          ))
        }
      </form.Subscribe>
      {isDisabled ? null : (
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              form.pushFieldValue("relations", {
                key: crypto.randomUUID(),
                ...EMPTY_RELATION_DRAFT,
              })
            }
          >
            {m.action_add_relation()}
          </Button>
        </div>
      )}
    </FormSection>
  );
}
