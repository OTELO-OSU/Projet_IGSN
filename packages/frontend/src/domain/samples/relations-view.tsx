import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";
import type { SampleRelation } from "@projet-igsn/domain/sample/relation/model";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { ExternalLink } from "@projet-igsn/design-system/components/ui/external-link";
import { igsnSchema } from "@projet-igsn/domain/igsn/model";
import { identifierTypeLabel } from "@projet-igsn/domain/sample/relation/identifier-type";
import { relationTargetHref } from "@projet-igsn/domain/sample/relation/relation-target-href";
import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";

import {
  relationTargetResourceTypeLabel,
  relationTypeLabel,
} from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

const publicApiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3002";

const attachmentUrl = (igsn: string, attachmentId: string) =>
  `${publicApiUrl.replace(/\/$/, "")}/samples/${igsn}/attachments/${attachmentId}`;

const relationSummary = ({
  relationType,
  identifierType,
  targetResourceType,
}: SampleRelation) =>
  [
    relationTypeLabel(relationType),
    identifierTypeLabel[identifierType],
    targetResourceType && relationTargetResourceTypeLabel(targetResourceType),
  ]
    .filter(Boolean)
    .join(" · ");

function RelationTarget({ relation }: { relation: SampleRelation }) {
  const { identifierType, identifier, targetTitle } = relation;

  if (identifierType === "igsn") {
    const parsed = igsnSchema.safeParse(identifier);
    if (parsed.success) {
      return (
        <Link
          to="/samples/$igsn"
          params={{ igsn: parsed.data }}
          className="font-medium break-all"
        >
          {targetTitle}
        </Link>
      );
    }
  }

  const href = relationTargetHref(identifier);

  if (href !== null) {
    return (
      <ExternalLink href={href} className="font-medium break-all">
        {targetTitle}
      </ExternalLink>
    );
  }

  return (
    <>
      <span className="font-medium break-all">{targetTitle}</span>
      <span className="text-muted-foreground break-all">{identifier}</span>
    </>
  );
}

type RelationsViewProps = {
  igsn: string;
  relations: SampleRelation[];
  attachments: SampleAttachment[];
};

export function RelationsView({
  igsn,
  relations,
  attachments,
}: RelationsViewProps) {
  return (
    <div className="mt-2 grid gap-6">
      {relations.length > 0 ? (
        <ul className="divide-y">
          {relations.map((relation) => (
            <li key={relation.id} className="grid gap-1 px-4 py-3">
              <span className="text-muted-foreground text-sm">
                {relationSummary(relation)}
              </span>
              <RelationTarget relation={relation} />
              {relation.description ? (
                <p className="text-muted-foreground whitespace-pre-line">
                  {relation.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {attachments.length > 0 ? (
        <div>
          <h3 className="text-muted-foreground px-4 pt-3 font-medium">
            {m.sample_related_resources_attachments()}
          </h3>
          <ul className="divide-y">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="grid gap-1 px-4 py-3">
                <div className="flex items-center gap-4">
                  <span className="flex-1 font-medium break-all">
                    {attachment.title ?? attachment.name}
                  </span>
                  {attachment.targetResourceType ? (
                    <span className="text-muted-foreground text-sm">
                      {relationTargetResourceTypeLabel(
                        attachment.targetResourceType,
                      )}
                    </span>
                  ) : null}
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={attachmentUrl(igsn, attachment.id)}
                      download={attachment.name}
                      aria-label={m.sample_attachment_download_name({
                        name: attachment.name,
                      })}
                    >
                      <Download aria-hidden />
                      {m.sample_attachment_download()}
                    </a>
                  </Button>
                </div>
                {attachment.description ? (
                  <p className="text-muted-foreground whitespace-pre-line">
                    {attachment.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
