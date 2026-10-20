import type { TemplateFieldKey } from "@projet-igsn/domain/sample/import/template-fields";

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
import { composeHierarchyValue } from "@projet-igsn/design-system/lib/hierarchy";
import { withRequired } from "@projet-igsn/design-system/lib/with-required";
import { reserveInternalIdsSchema } from "@projet-igsn/domain/sample/import/import-validator";
import { includedTemplateFields } from "@projet-igsn/domain/sample/import/included-template-fields";
import { isMassImportableMaterial } from "@projet-igsn/domain/sample/import/is-mass-importable-material";
import { lockedTemplateFields } from "@projet-igsn/domain/sample/import/locked-template-fields";
import { MATERIAL_HIERARCHY } from "@projet-igsn/domain/sample/material/classification";
import { PROVENANCE_STATUSES } from "@projet-igsn/domain/sample/scientific-context/provenance-status";
import { ArrowLeftIcon, FileDownIcon } from "lucide-react";

import { useAttachableManualGroups } from "#/manual-groups/use-attachable-manual-groups.ts";
import { m } from "#/paraglide/messages.js";
import { HIERARCHY_FIELD_LABELS } from "#/samples/hierarchy-field-labels.ts";
import { ReserveInternalIdsField } from "#/samples/reserve-internal-ids-field.tsx";
import {
  materialPathLabel,
  provenanceStatusLabel,
} from "#/samples/sample-labels.ts";
import { TemplateFieldCheckboxes } from "#/samples/template-field-checkboxes.tsx";
import { useDownloadImportTemplate } from "#/samples/use-download-import-template.ts";
import { useTemplateCustomization } from "#/samples/use-template-customization.ts";

const PROVENANCE_ITEMS = toComboboxItems(
  PROVENANCE_STATUSES,
  provenanceStatusLabel,
);

export type TemplateDialogValues = {
  materialPath: string[];
  groupId: string;
  provenanceValue: string;
  subSamples: boolean;
  fields: Record<TemplateFieldKey, boolean>;
};

export function CustomizeTemplateDialog({
  open,
  onBack,
  initialValues,
}: {
  open: boolean;
  onBack: () => void;
  initialValues?: TemplateDialogValues;
}) {
  const {
    materialPath,
    setMaterialPath,
    groupId,
    setGroupId,
    provenanceValue,
    setProvenanceValue,
    subSamples,
    setSubSamples,
    fields,
    setFields,
    isReserving,
    setIsReserving,
    reserveCount,
    setReserveCount,
  } = useTemplateCustomization(initialValues);
  const reservation = reserveInternalIdsSchema.safeParse({
    count: Number(reserveCount),
  });
  const isCountInvalid = isReserving && !reservation.success;
  const groups = useAttachableManualGroups().data?.data ?? [];
  const downloadTemplate = useDownloadImportTemplate();
  const provenanceStatus = PROVENANCE_STATUSES.find(
    (status) => status === provenanceValue,
  );
  const material = composeHierarchyValue(materialPath);
  const isRefused = material !== null && !isMassImportableMaterial(material);
  const manualGroupId = groups.some((group) => group.id === groupId)
    ? groupId
    : undefined;
  const locks = lockedTemplateFields({
    provenanceStatus,
    hasManualGroup: manualGroupId !== undefined,
  });
  const includedFields = includedTemplateFields(fields, locks);
  const customization = provenanceStatus
    ? {
        provenanceStatus,
        materialPath: material ?? undefined,
        manualGroupId,
        subSamples,
        ...includedFields,
      }
    : undefined;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? null : onBack())}>
      <DialogContent className="sm:max-w-xl" closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.customize_template_title()}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
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
            <Label htmlFor="customize-template-group">
              {m.customize_template_group_label()}
            </Label>
            <Combobox
              id="customize-template-group"
              items={groups.map((group) => ({
                value: group.id,
                label: group.name,
              }))}
              value={groupId}
              onChange={setGroupId}
              placeholder={m.manual_group_placeholder()}
              searchPlaceholder={m.manual_groups_search_placeholder()}
              emptyText={m.manual_groups_empty()}
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
            <Checkbox
              id="customize-template-subsamples"
              checked={subSamples}
              onCheckedChange={(checked) => setSubSamples(checked === true)}
            />
            <Label htmlFor="customize-template-subsamples">
              {m.customize_template_subsamples()}
            </Label>
          </div>
          <TemplateFieldCheckboxes
            fields={fields}
            includedFields={includedFields}
            locks={locks}
            onChange={setFields}
          />
        </div>
        <ReserveInternalIdsField
          isReserving={isReserving}
          onReservingChange={setIsReserving}
          reserveCount={reserveCount}
          onReserveCountChange={setReserveCount}
          isCountInvalid={isCountInvalid}
        />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeftIcon aria-hidden />
            {initialValues ? m.action_close() : m.action_back()}
          </Button>
          <Button
            type="button"
            disabled={
              !provenanceStatus ||
              isRefused ||
              isCountInvalid ||
              downloadTemplate.isPending
            }
            onClick={() => {
              if (!customization) return;
              downloadTemplate.mutate(
                isReserving && reservation.success
                  ? { ...reservation.data, ...customization }
                  : customization,
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
