import type { Sample } from "@projet-igsn/domain/sample/sample";

import { BreadcrumbFieldRow } from "#/domain/samples/breadcrumb-field-row.tsx";
import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import {
  elementLabel,
  resourceTypeLabel,
} from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

export type EconomicInterestViewProps = {
  resourceType: Sample["resourceType"];
  economicInterestElements: Sample["economicInterestElements"];
  economicResourceTypePrecision: Sample["economicResourceTypePrecision"];
  economicDepositName: Sample["economicDepositName"];
  economicDepositDescription: Sample["economicDepositDescription"];
};

export function EconomicInterestView({
  resourceType,
  economicInterestElements,
  economicResourceTypePrecision,
  economicDepositName,
  economicDepositDescription,
}: EconomicInterestViewProps) {
  return (
    <FieldRows>
      <BreadcrumbFieldRow
        id="sample-field-resource-type"
        label={m.sample_field_resource_type()}
        path={resourceType}
        pathLabel={resourceTypeLabel}
      />
      <FieldRow
        label={m.sample_field_economic_interest_elements()}
        value={economicInterestElements.map(elementLabel).join(", ")}
      />
      <FieldRow
        label={m.sample_field_economic_resource_type_precision()}
        value={economicResourceTypePrecision}
      />
      <FieldRow
        label={m.sample_field_economic_deposit_name()}
        value={economicDepositName}
      />
      <FieldRow
        label={m.sample_field_economic_deposit_description()}
        value={economicDepositDescription}
      />
    </FieldRows>
  );
}
