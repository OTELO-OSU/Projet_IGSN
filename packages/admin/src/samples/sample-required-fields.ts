import type { PublishRequirement } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";

import { composeHierarchyValue } from "@projet-igsn/design-system/lib/hierarchy";
import { isReadingControlled } from "@projet-igsn/domain/sample/condition/controlled-reading";
import { allowsLocation } from "@projet-igsn/domain/sample/location/allows-location";
import { allowsMineralClassifications } from "@projet-igsn/domain/sample/mineral/allows-mineral-classifications";
import { samplePublishRequirements } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { identifierTypeLabel } from "@projet-igsn/domain/sample/relation/identifier-type";
import { isSyntheticMaterial } from "@projet-igsn/domain/sample/synthetic-details/is-synthetic-material";
import { getBy } from "@tanstack/react-form";

import type { AttachmentMetadata } from "#/samples/use-attachment-changes.ts";

import { m } from "#/paraglide/messages.js";
import { hasReadingType } from "#/samples/compose-condition.ts";
import { isTypedPerson } from "#/samples/compose-contact.ts";
import { hasMeasurementValue } from "#/samples/compose-measurement.ts";
import { ROWS } from "#/samples/location-position-fields.tsx";
import { MEASUREMENTS } from "#/samples/measurement-fields.tsx";
import { READINGS } from "#/samples/sample-condition-fields.tsx";
import { publishBlockerField } from "#/samples/sample-draft-field-errors.ts";
import {
  isUnclassified,
  type SampleDraft,
} from "#/samples/sample-draft-schema.ts";
import { samplePublishInput } from "#/samples/sample-publish-input.ts";
import {
  EXPERIMENT_DURATION,
  SYNTHESIS_MEASUREMENTS,
} from "#/samples/sample-synthetic-details-fields.tsx";

export type RequiredField = { name: string; isMet: boolean };

const hasValue = (value: unknown): boolean => value != null && value !== "";

const filled = (values: SampleDraft, name: string): RequiredField => ({
  name,
  isMet: hasValue(getBy(values, name)),
});

const isSubSample = (values: SampleDraft): boolean =>
  values.parentIds.length > 0;

const isLocated = (values: SampleDraft): boolean =>
  !isSubSample(values) &&
  allowsLocation(composeHierarchyValue(values.materialPath));

const ageRangeFields = (
  values: SampleDraft,
  bound: "numericAge" | "geologicalAge",
): RequiredField[] =>
  values.age[`${bound}Min`] === values.age[`${bound}Max`]
    ? []
    : [filled(values, `age.${bound}Min`), filled(values, `age.${bound}Max`)];

const verticalFields = (values: SampleDraft): RequiredField[] => {
  const type = values.location.type;
  if (!isLocated(values) || !type) return [];
  return [
    "location.verticalReference",
    ...ROWS[type].vertical.map(([key]) => `location.${key}`),
  ].map((name) => filled(values, name));
};

const contactField = (values: SampleDraft, typedName: string): string => {
  const person = typedName.replace(/(Firstname|Lastname)$/, "");
  return isTypedPerson(values, person) ? typedName : `${person}UserId`;
};

const CONTACT_NAME_BLOCKER = /_(first|last)name_missing$/;

function requirementFields(
  { blocker, isMet, index }: PublishRequirement,
  values: SampleDraft,
): RequiredField[] {
  const one = (name: string): RequiredField[] => [{ name, isMet }];
  if (blocker === "collection_date_missing" && isSubSample(values)) return [];
  switch (blocker) {
    case "process_step_date_missing":
      return one(`processSteps[${index}].dateStart`);
    case "numeric_age_range_incomplete":
      return ageRangeFields(values, "numericAge");
    case "geological_age_range_incomplete":
      return ageRangeFields(values, "geologicalAge");
    case "vertical_position_incomplete":
      return verticalFields(values);
    case "additional_role_firstname_missing":
    case "additional_role_lastname_missing":
      return one(
        contactField(
          values,
          `scientificContext.additionalRoles[${index}].person${blocker === "additional_role_firstname_missing" ? "Firstname" : "Lastname"}`,
        ),
      );
    case "relation_resource_type_missing":
      return one(`relations[${index}].targetResourceType`);
    case "attachment_metadata_missing":
      return one(`attachments[${index}]`);
    default: {
      const name = publishBlockerField(blocker);
      if (name === null) return [];
      return one(
        CONTACT_NAME_BLOCKER.test(blocker) ? contactField(values, name) : name,
      );
    }
  }
}

type LabeledField = RequiredField & { label: () => string };

const labeled = (
  values: SampleDraft,
  name: string,
  label: () => string,
): LabeledField => ({ ...filled(values, name), label });

const dateRangeFields = (
  values: SampleDraft,
  prefix: string,
  endLabel: () => string,
  timeZoneLabel: () => string,
): LabeledField[] => [
  ...(getBy(values, `${prefix}Start`) === getBy(values, `${prefix}End`)
    ? []
    : [labeled(values, `${prefix}End`, endLabel)]),
  ...(getBy(values, `${prefix}Precision`) === "hour"
    ? [labeled(values, `${prefix}TimeZone`, timeZoneLabel)]
    : []),
];

export function saveRequiredFields(values: SampleDraft): LabeledField[] {
  const material = composeHierarchyValue(values.materialPath);
  const isSynthetic = isSyntheticMaterial(material);
  const { description, syntheticDetails, condition, location } = values;
  return [
    { name: "name", isMet: !!values.name?.trim(), label: m.field_name },
    ...MEASUREMENTS.filter(({ key }) =>
      hasMeasurementValue(description[`${key}Value`]),
    ).map(({ key, unitLabel }) =>
      labeled(values, `description.${key}Unit`, unitLabel),
    ),
    ...(isSynthetic
      ? [EXPERIMENT_DURATION, ...SYNTHESIS_MEASUREMENTS]
          .filter(({ key }) =>
            hasMeasurementValue(syntheticDetails[`${key}Value`]),
          )
          .map(({ key, unitLabel }) =>
            labeled(values, `syntheticDetails.${key}Unit`, unitLabel),
          )
      : []),
    ...READINGS.filter(
      ({ key }) =>
        isReadingControlled(condition.storageConditions, key) &&
        hasReadingType(condition[`${key}Type`]) &&
        hasMeasurementValue(condition[`${key}Value`]),
    ).map(({ key, unitLabel }) =>
      labeled(values, `condition.${key}Unit`, unitLabel),
    ),
    ...values.relations.flatMap(({ identifierType }, index) => [
      labeled(
        values,
        `relations[${index}].identifier`,
        () => identifierTypeLabel[identifierType],
      ),
      labeled(
        values,
        `relations[${index}].relationType`,
        m.field_relation_type,
      ),
    ]),
    ...(allowsMineralClassifications(material) &&
    !isUnclassified(values.mineralClassifications)
      ? values.mineralClassifications.map(({ path }, index) => ({
          name: `mineralClassifications[${index}].path`,
          isMet: path.length > 0,
          label: m.field_mineral_classification,
        }))
      : []),
    ...(isLocated(values) && location.type
      ? ROWS[location.type].coordinates
          .flat()
          .map(([key, label]) => labeled(values, `location.${key}`, label))
      : []),
    ...(isSubSample(values)
      ? []
      : dateRangeFields(
          values,
          "description.collectionDate",
          m.field_collection_date_end,
          m.field_collection_time_zone,
        )),
    ...(isSynthetic
      ? dateRangeFields(
          values,
          "syntheticDetails.synthesisDate",
          m.field_synthesis_date_end,
          m.field_synthesis_time_zone,
        )
      : []),
    ...values.processSteps.flatMap((_, index) =>
      dateRangeFields(
        values,
        `processSteps[${index}].date`,
        m.field_process_step_date_end,
        m.field_process_step_time_zone,
      ),
    ),
  ];
}

export function sampleRequiredFields(
  values: SampleDraft,
  attachments: AttachmentMetadata[],
): RequiredField[] {
  const merged = new Map<string, boolean>();
  for (const { name, isMet } of [
    ...samplePublishRequirements(
      samplePublishInput(values, attachments),
    ).flatMap((requirement) => requirementFields(requirement, values)),
    ...saveRequiredFields(values),
  ]) {
    merged.set(name, (merged.get(name) ?? true) && isMet);
  }
  return [...merged].map(([name, isMet]) => ({ name, isMet }));
}
