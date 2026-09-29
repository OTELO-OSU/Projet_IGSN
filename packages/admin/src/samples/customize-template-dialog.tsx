import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Checkbox } from "@projet-igsn/design-system/components/ui/checkbox";
import {
  Combobox,
  toComboboxItems,
} from "@projet-igsn/design-system/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@projet-igsn/design-system/components/ui/dialog";
import { HierarchyInput } from "@projet-igsn/design-system/components/ui/hierarchy-input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { MultiCombobox } from "@projet-igsn/design-system/components/ui/multi-combobox";
import {
  composeHierarchyValue,
  toHierarchyPath,
} from "@projet-igsn/design-system/lib/hierarchy";
import { withRequired } from "@projet-igsn/design-system/lib/with-required";
import { isMassImportableMaterial } from "@projet-igsn/domain/sample/import/is-mass-importable-material";
import {
  MATERIAL_HIERARCHY,
  MATERIAL_ROOTS,
} from "@projet-igsn/domain/sample/material/classification";
import { PROVENANCE_STATUSES } from "@projet-igsn/domain/sample/scientific-context/provenance-status";
import { ArrowLeftIcon, FileDownIcon } from "lucide-react";
import { useState } from "react";

import { useAttachableManualGroups } from "#/manual-groups/use-attachable-manual-groups.ts";
import { m } from "#/paraglide/messages.js";
import { HIERARCHY_FIELD_LABELS } from "#/samples/hierarchy-field-labels.ts";
import { ReserveInternalIdsDialog } from "#/samples/reserve-internal-ids-dialog.tsx";
import {
  materialPathLabel,
  provenanceStatusLabel,
} from "#/samples/sample-labels.ts";
import { useDownloadImportTemplate } from "#/samples/use-download-import-template.ts";

const PROVENANCE_ITEMS = toComboboxItems(
  PROVENANCE_STATUSES,
  provenanceStatusLabel,
);

export function CustomizeTemplateDialog({
  open,
  onBack,
}: {
  open: boolean;
  onBack: () => void;
}) {
  const [materialPath, setMaterialPath] = useState<string[]>(() =>
    toHierarchyPath(MATERIAL_ROOTS[0]),
  );
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [provenanceValue, setProvenanceValue] = useState("");
  const groups = useAttachableManualGroups().data?.data ?? [];
  const downloadTemplate = useDownloadImportTemplate();
  const provenanceStatus = PROVENANCE_STATUSES.find(
    (status) => status === provenanceValue,
  );
  const material = composeHierarchyValue(materialPath);
  const isRefused = material !== null && !isMassImportableMaterial(material);
  const customization = provenanceStatus
    ? {
        provenanceStatus,
        materialPath: material ?? undefined,
        manualGroupIds: groupIds,
      }
    : undefined;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? null : onBack())}>
      <DialogContent className="sm:max-w-xl" closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.customize_template_title()}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 rounded-md border p-4">
          <div className="grid gap-2">
            <Label htmlFor="customize-template-material">
              {m.customize_template_material_label()}
            </Label>
            <HierarchyInput
              id="customize-template-material"
              hierarchy={MATERIAL_HIERARCHY}
              translate={materialPathLabel}
              value={materialPath}
              onChange={setMaterialPath}
              placeholder={m.material_placeholder()}
              searchPlaceholder={m.material_search_placeholder()}
              emptyText={m.material_empty()}
              stopLabel={HIERARCHY_FIELD_LABELS.stopLabel}
              removeLabel={HIERARCHY_FIELD_LABELS.removeLabel}
            />
          </div>
          {material !== null && isRefused ? (
            <p role="alert" className="text-destructive text-sm">
              {m.customize_template_mineral_error({
                material: materialPathLabel(material),
              })}
            </p>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="customize-template-groups">
              {m.customize_template_groups_label()}
            </Label>
            <MultiCombobox
              id="customize-template-groups"
              items={groups.map((group) => ({
                value: group.id,
                label: group.name,
              }))}
              values={groupIds}
              onChange={setGroupIds}
              placeholder={m.manual_group_placeholder()}
              searchPlaceholder={m.manual_groups_search_placeholder()}
              emptyText={m.manual_groups_empty()}
              removeLabel={(label) =>
                m.manual_group_detach_member({ name: label })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customize-template-provenance">
              {withRequired(m.customize_template_provenance_label(), true)}
            </Label>
            <Combobox
              id="customize-template-provenance"
              items={PROVENANCE_ITEMS}
              value={provenanceValue}
              onChange={setProvenanceValue}
              placeholder={m.provenance_status_placeholder()}
              searchPlaceholder={m.provenance_status_search_placeholder()}
              emptyText={m.provenance_status_empty()}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="customize-template-subsamples" disabled />
            <Label htmlFor="customize-template-subsamples">
              {m.customize_template_subsamples()}
            </Label>
          </div>
        </div>
        <ReserveInternalIdsDialog
          customization={customization}
          disabled={!provenanceStatus || isRefused}
          onDownloaded={onBack}
        />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeftIcon aria-hidden />
            {m.action_back()}
          </Button>
          <Button
            type="button"
            disabled={
              !provenanceStatus || isRefused || downloadTemplate.isPending
            }
            onClick={() => {
              if (!customization) return;
              downloadTemplate.mutate(customization, {
                onSuccess: () => onBack(),
              });
            }}
          >
            <FileDownIcon aria-hidden />
            {m.action_download_this_template()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
