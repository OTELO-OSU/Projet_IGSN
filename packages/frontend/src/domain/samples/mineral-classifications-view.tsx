import type { MineralClassification } from "@projet-igsn/domain/sample/mineral/model";

import { ExternalLink } from "@projet-igsn/design-system/components/ui/external-link";
import {
  mineralOf,
  toMindatUri,
  toMineralPath,
} from "@projet-igsn/domain/sample/mineral/mineral-hierarchy";

import { BreadcrumbFieldRow } from "#/domain/samples/breadcrumb-field-row.tsx";
import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import {
  mineralAbundanceLabel,
  mineralClassificationLabel,
} from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

export function MineralClassificationsView({
  mineralClassifications,
}: {
  mineralClassifications: MineralClassification[];
}) {
  return (
    <ul className="mt-2 divide-y">
      {mineralClassifications.map((row) => {
        const path = toMineralPath(row);
        const mineral = mineralOf(row.mindatId);
        return (
          <li key={path}>
            <FieldRows>
              <BreadcrumbFieldRow
                id={`mineral-classification-${path}`}
                label={m.sample_field_mineral_classification()}
                path={path}
                pathLabel={mineralClassificationLabel}
              />
              <FieldRow
                label={m.sample_field_mineral_abundance()}
                value={row.abundance && mineralAbundanceLabel(row.abundance)}
              />
              <FieldRow
                label={m.sample_field_strunz_code()}
                value={mineral?.strunzCode}
              />
              <FieldRow
                label={m.sample_field_mindat_id()}
                value={
                  mineral && (
                    <ExternalLink href={toMindatUri(mineral.mindatId)}>
                      {mineral.mindatId}
                    </ExternalLink>
                  )
                }
              />
            </FieldRows>
          </li>
        );
      })}
    </ul>
  );
}
