import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@projet-igsn/design-system/components/ui/accordion";
import { Checkbox } from "@projet-igsn/design-system/components/ui/checkbox";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import {
  TEMPLATE_FIELDS,
  TEMPLATE_SECTION_KEYS,
  PARTLY_EXCLUDABLE_TEMPLATE_SECTIONS,
  type TemplateFieldKey,
  type TemplateSectionKey,
} from "@projet-igsn/domain/sample/import/template-fields";

import { m } from "#/paraglide/messages.js";

const SECTION_LABELS: Record<TemplateSectionKey, () => string> = {
  identity: m.tab_identity,
  sampleClassification: m.tab_sample_classification,
  location: m.tab_location,
  geologicalContext: m.section_geological_context,
  age: m.tab_age,
  physicalDescription: m.tab_physical_description,
  scientificContext: m.tab_scientific_context,
  conservationSecurity: m.tab_conservation_security,
  repository: m.tab_curation_repository,
  relatedDocuments: m.tab_related_resources,
};

const TEMPLATE_FIELD_LABELS: Record<TemplateFieldKey, () => string> = {
  localId: m.field_local_id,
  collectionMethod: m.field_collection_method,
  collectionMethodDescription: m.field_collection_method_description,
  collectionDate: m.field_collection_dates,
  manualGroup: m.section_manual_groups,
  texture: m.field_texture,
  metamorphicFacies: m.field_metamorphic_facies,
  metamorphicFabric: m.field_metamorphic_fabric,
  specificName: m.field_specific_name,
  resourceType: m.field_resource_type,
  depositName: m.field_economic_deposit_name,
  depositDescription: m.field_economic_deposit_description,
  elementsOfInterest: m.field_economic_interest_elements,
  position: m.import_template_field_position,
  navigationType: m.field_navigation_type,
  region: m.field_region,
  localityName: m.field_locality_name,
  localityDescription: m.field_locality_description,
  verticalPositions: m.legend_vertical_positions,
  geologicalContextDescription: m.field_geological_context_description,
  physiographicEnvironment: m.field_physiographic_environment,
  numericAge: m.field_numeric_age,
  geologicalAge: m.field_geological_age,
  geologicalUnit: m.field_geological_unit,
  openDescription: m.field_open_description,
  length: m.field_length,
  width: m.field_width,
  thickness: m.field_thickness,
  mass: m.field_mass,
  volume: m.field_volume,
  orientation: m.field_oriented,
  collector: m.field_collector_name,
  chiefScientist: m.field_chief_scientist,
  funding: m.field_funding,
  funderOrganizations: m.field_funder_organizations,
  researchProgramName: m.field_research_program_name,
  researchProgramDescription: m.field_research_program_description,
  hostInstitution: m.field_host_institution,
  platformType: m.field_platform_type,
  launchPlatformName: m.field_launch_platform_name,
  collectionOrigin: m.field_collection_origin,
  collectionContextDescription: m.field_collection_context_description,
  additionalRoles: m.legend_additional_roles,
  packaging: m.field_packaging,
  specificConditions: m.field_specific_conditions,
  radioactivity: m.field_radioactivity,
  asbestos: m.field_asbestos_rich,
  chemicalRisk: m.field_chemical_risk,
  storageConditions: m.field_storage_conditions,
  curationStatus: m.section_curation,
  currentArchive: m.section_current_archive,
  collectionName: m.field_collection_name,
  currentArchiveContact: m.legend_contact,
  rightsHolder: m.field_rights_holder,
  relations: m.section_relations,
  attachments: m.section_attachments,
};

export function TemplateFieldCheckboxes({
  fields,
  lockedFields,
  onChange,
}: {
  fields: Record<TemplateFieldKey, boolean>;
  lockedFields: readonly TemplateFieldKey[];
  onChange: (fields: Record<TemplateFieldKey, boolean>) => void;
}) {
  return (
    <Accordion type="multiple">
      {TEMPLATE_SECTION_KEYS.map((section) => {
        const sectionFields = TEMPLATE_FIELDS.filter(
          (field) => field.section === section,
        );
        const isIncluded = sectionFields.map(({ key }) => fields[key]);
        const isPartlyExcludable =
          PARTLY_EXCLUDABLE_TEMPLATE_SECTIONS.includes(section);
        const sectionCheckbox = (
          <Checkbox
            aria-label={m.import_template_include_section({
              section: SECTION_LABELS[section](),
            })}
            checked={
              isIncluded.every(Boolean)
                ? true
                : isPartlyExcludable || isIncluded.some(Boolean)
                  ? "indeterminate"
                  : false
            }
            disabled={isPartlyExcludable}
            className="disabled:pointer-events-none"
            onCheckedChange={(checked) =>
              onChange({
                ...fields,
                ...Object.fromEntries(
                  sectionFields.map(({ key }) => [key, checked === true]),
                ),
              })
            }
          />
        );
        return (
          <AccordionItem key={section} value={section}>
            <div className="flex items-center gap-2">
              {isPartlyExcludable ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} className="flex">
                      {sectionCheckbox}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {m.import_template_section_mandatory()}
                  </TooltipContent>
                </Tooltip>
              ) : (
                sectionCheckbox
              )}
              <AccordionTrigger>{SECTION_LABELS[section]()}</AccordionTrigger>
            </div>
            <AccordionContent className="grid gap-2 ps-6">
              {sectionFields.map(({ key }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`customize-template-field-${key}`}
                    checked={fields[key]}
                    disabled={lockedFields.includes(key)}
                    onCheckedChange={(checked) =>
                      onChange({ ...fields, [key]: checked === true })
                    }
                  />
                  <Label htmlFor={`customize-template-field-${key}`}>
                    {TEMPLATE_FIELD_LABELS[key]()}
                  </Label>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
