import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { ExternalLinkIcon } from "lucide-react";

import { frontendSampleUrl } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";
import { FieldLock } from "#/samples/field-lock.tsx";

export function ParentSampleField({
  parent,
  label,
  isSaved,
}: {
  parent: Pick<SampleParent, "igsn" | "name">;
  label: string;
  isSaved: boolean;
}) {
  const id = `parent-${parent.igsn}`;
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid w-full gap-2 sm:w-72">
        <div className="flex items-center gap-1">
          <Label htmlFor={id}>{label}</Label>
          <FieldLock
            isClosed={isSaved}
            text={
              isSaved
                ? m.parent_locked_since_save()
                : m.parent_locked_after_save()
            }
          />
        </div>
        <Input id={id} value={parent.name} disabled />
      </div>
      <Button asChild variant="outline">
        <a
          href={frontendSampleUrl(parent.igsn)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={m.action_see_parent_named({ name: parent.name })}
        >
          <ExternalLinkIcon aria-hidden />
          {m.action_see_parent()}
        </a>
      </Button>
    </div>
  );
}
