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
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { MultiCombobox } from "@projet-igsn/design-system/components/ui/multi-combobox";
import { hierarchyLevelItems } from "@projet-igsn/design-system/lib/hierarchy";
import { withRequired } from "@projet-igsn/design-system/lib/with-required";
import { isMassImportableMaterial } from "@projet-igsn/domain/sample/import/is-mass-importable-material";
import { MATERIAL_HIERARCHY } from "@projet-igsn/domain/sample/material/classification";
import { PROVENANCE_STATUSES } from "@projet-igsn/domain/sample/scientific-context/provenance-status";
import { ArrowLeftIcon, FileDownIcon } from "lucide-react";
import { useState } from "react";

import { useAttachableManualGroups } from "#/manual-groups/use-attachable-manual-groups.ts";
import { m } from "#/paraglide/messages.js";
import {
  materialPathLabel,
  provenanceStatusLabel,
} from "#/samples/sample-labels.ts";
import { useDownloadImportTemplate } from "#/samples/use-download-import-template.ts";

const MATERIAL_ITEMS = hierarchyLevelItems(
  MATERIAL_HIERARCHY,
  "rock_and_sediment",
  materialPathLabel,
);
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
  const [materialLevel1, setMaterialLevel1] = useState("");
  const [materialLevel2, setMaterialLevel2] = useState("");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [provenanceValue, setProvenanceValue] = useState("");
  const groups = useAttachableManualGroups().data?.data ?? [];
  const downloadTemplate = useDownloadImportTemplate();
  const provenanceStatus = PROVENANCE_STATUSES.find(
    (status) => status === provenanceValue,
  );
  const isRefused = !isMassImportableMaterial(materialLevel1);
  const level2Items =
    materialLevel1 && !isRefused
      ? hierarchyLevelItems(
          MATERIAL_HIERARCHY,
          materialLevel1,
          materialPathLabel,
        )
      : [];

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
            <Combobox
              id="customize-template-material"
              items={MATERIAL_ITEMS}
              value={materialLevel1}
              onChange={(next) => {
                setMaterialLevel1(next);
                setMaterialLevel2("");
              }}
              placeholder={m.material_placeholder()}
              searchPlaceholder={m.material_search_placeholder()}
              emptyText={m.material_empty()}
            />
          </div>
          {isRefused ? (
            <p role="alert" className="text-destructive text-sm">
              {m.customize_template_mineral_error({
                material: materialPathLabel(materialLevel1),
              })}
            </p>
          ) : null}
          {level2Items.length > 0 ? (
            <div className="grid gap-2">
              <Label htmlFor="customize-template-material-level-2">
                {materialPathLabel(materialLevel1)}
              </Label>
              <Combobox
                id="customize-template-material-level-2"
                items={level2Items}
                value={materialLevel2}
                onChange={setMaterialLevel2}
                placeholder={m.material_placeholder()}
                searchPlaceholder={m.material_search_placeholder()}
                emptyText={m.material_empty()}
              />
            </div>
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
              if (!provenanceStatus) return;
              downloadTemplate.mutate(
                {
                  provenanceStatus,
                  materialPath: materialLevel2 || materialLevel1 || undefined,
                  manualGroupIds: groupIds,
                },
                { onSuccess: () => onBack() },
              );
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
