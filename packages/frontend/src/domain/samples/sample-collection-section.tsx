import type { Sample } from "@projet-igsn/domain/sample/sample";

import { pathBreadcrumb } from "#/domain/samples/path-breadcrumb.ts";
import { collectionMethodLabel } from "#/domain/samples/sample-labels.ts";
import {
  ClassificationBreadcrumb,
  Field,
} from "#/domain/samples/sample-view-fields.tsx";
import { m } from "#/paraglide/messages.js";

type CollectionSectionProps = {
  collectionMethod: Sample["collectionMethod"];
  collectionMethodDescription: Sample["collectionMethodDescription"];
};

export function hasCollection({
  collectionMethod,
  collectionMethodDescription,
}: CollectionSectionProps): boolean {
  return Boolean(collectionMethod || collectionMethodDescription);
}

export function CollectionSection({
  collectionMethod,
  collectionMethodDescription,
}: CollectionSectionProps) {
  if (!hasCollection({ collectionMethod, collectionMethodDescription })) {
    return null;
  }

  return (
    <section id="collection" aria-labelledby="collection-heading">
      <h2
        id="collection-heading"
        className="rounded-md bg-sky-50 px-4 py-3 text-lg font-semibold text-sky-900"
      >
        {m.sample_section_collection()}
      </h2>
      <dl className="mt-2 divide-y">
        {collectionMethod ? (
          <div className="flex gap-4 px-4 py-3">
            <dt
              id="sample-field-collection-method"
              className="text-muted-foreground w-40"
            >
              {m.sample_field_collection_method()}
            </dt>
            <dd>
              <ClassificationBreadcrumb
                labelId="sample-field-collection-method"
                segments={pathBreadcrumb(
                  collectionMethod,
                  collectionMethodLabel,
                )}
              />
            </dd>
          </div>
        ) : null}
        {collectionMethodDescription ? (
          <Field label={m.sample_field_collection_method_description()}>
            {collectionMethodDescription}
          </Field>
        ) : null}
      </dl>
    </section>
  );
}
