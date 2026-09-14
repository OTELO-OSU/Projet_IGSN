import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@projet-igsn/design-system/components/ui/dialog";
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { SamplePicker } from "#/samples/sample-picker.tsx";

export function SecondParentDialog({
  firstParent,
  onContinue,
  onCancel,
}: {
  firstParent: SampleParent;
  onContinue: (secondParent: SampleParent | null) => void;
  onCancel: () => void;
}) {
  const [secondParent, setSecondParent] = useState<SampleParent | null>(null);

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onCancel())}>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.second_parent_dialog_title()}</DialogTitle>
          <DialogDescription>
            {m.second_parent_dialog_description()}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="second-parent-first">{m.field_first_parent()}</Label>
          <Input
            id="second-parent-first"
            readOnly
            disabled
            value={`${firstParent.name} (${firstParent.igsn})`}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="second-parent-picked">
            {m.field_second_parent()}
          </Label>
          <SamplePicker
            id="second-parent-picked"
            value={secondParent}
            onChange={setSecondParent}
            exclude={firstParent.id}
            placeholder={m.second_parent_placeholder()}
            clearLabel={m.second_parent_none()}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {m.action_cancel()}
          </Button>
          <Button type="button" onClick={() => onContinue(secondParent)}>
            {m.action_continue()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
