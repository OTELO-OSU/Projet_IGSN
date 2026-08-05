import type { Sample } from "@projet-igsn/domain/sample/sample";

import { BreadcrumbFieldRow } from "#/domain/samples/breadcrumb-field-row.tsx";
import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import {
  economicInterestLabel,
  elementLabel,
} from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

export type EconomicInterestViewProps = {
  economicInterest: NonNullable<Sample["economicInterest"]>;
  economicInterestElements: Sample["economicInterestElements"];
  economicResourceTypePrecision: Sample["economicResourceTypePrecision"];
  economicDepositName: Sample["economicDepositName"];
  economicDepositDescription: Sample["economicDepositDescription"];
};

export function EconomicInterestView({
  economicInterest,
  economicInterestElements,
  economicResourceTypePrecision,
  economicDepositName,
  economicDepositDescription,
}: EconomicInterestViewProps) {
  return (
    <FieldRows>
      <BreadcrumbFieldRow
        id="sample-field-economic-interest"
        label={m.sample_field_economic_interest()}
        path={economicInterest}
        pathLabel={economicInterestLabel}
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
