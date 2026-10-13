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
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import {
  composeHierarchyValue,
  toHierarchyPath,
} from "@projet-igsn/design-system/lib/hierarchy";
import { withRequired } from "@projet-igsn/design-system/lib/with-required";
import {
  reserveInternalIdsSchema,
  TEMPLATE_SECTION_KEYS,
  type TemplateSectionKey,
} from "@projet-igsn/domain/sample/import/import-validator";
import { isMassImportableMaterial } from "@projet-igsn/domain/sample/import/is-mass-importable-material";
import { MAX_IMPORT_ROWS } from "@projet-igsn/domain/sample/import/max-import-rows";
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
import {
  materialPathLabel,
  provenanceStatusLabel,
} from "#/samples/sample-labels.ts";
import { useDownloadImportTemplate } from "#/samples/use-download-import-template.ts";

const PROVENANCE_ITEMS = toComboboxItems(
  PROVENANCE_STATUSES,
  provenanceStatusLabel,
);

const SECTION_LABELS: Record<TemplateSectionKey, () => string> = {
  physicalDescription: m.tab_physical_description,
  age: m.tab_age,
  conservationSecurity: m.tab_conservation_security,
  repository: m.tab_curation_repository,
  relatedDocuments: m.tab_related_resources,
  geologicalContext: m.section_geological_context,
};

const ALL_SECTIONS: Record<TemplateSectionKey, boolean> = {
  physicalDescription: true,
  age: true,
  conservationSecurity: true,
  repository: true,
  relatedDocuments: true,
  geologicalContext: true,
};

export type TemplateDialogValues = {
  materialPath: string[];
  groupId: string;
  provenanceValue: string;
  subSamples: boolean;
  sections: Record<TemplateSectionKey, boolean>;
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
  const [materialPath, setMaterialPath] = useState<string[]>(
    () => initialValues?.materialPath ?? toHierarchyPath(MATERIAL_ROOTS[0]),
  );
  const [groupId, setGroupId] = useState(initialValues?.groupId ?? "");
  const [provenanceValue, setProvenanceValue] = useState(
    initialValues?.provenanceValue ?? "",
  );
  const [subSamples, setSubSamples] = useState(
    initialValues?.subSamples ?? false,
  );
  const [sections, setSections] = useState(
    initialValues?.sections ?? ALL_SECTIONS,
  );
  const [isReserving, setIsReserving] = useState(false);
  const [reserveCount, setReserveCount] = useState("250");
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
  const customization = provenanceStatus
    ? {
        provenanceStatus,
        materialPath: material ?? undefined,
        manualGroupId: groups.some((group) => group.id === groupId)
          ? groupId
          : undefined,
        subSamples,
        ...sections,
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
          {TEMPLATE_SECTION_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`customize-template-section-${key}`}
                checked={sections[key]}
                onCheckedChange={(checked) =>
                  setSections({ ...sections, [key]: checked === true })
                }
              />
              <Label htmlFor={`customize-template-section-${key}`}>
                {m.import_template_include_section({
                  section: SECTION_LABELS[key](),
                })}
              </Label>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="customize-template-reserve"
            checked={isReserving}
            onCheckedChange={(checked) => setIsReserving(checked === true)}
          />
          <Label htmlFor="customize-template-reserve">
            {m.import_template_reserve_label()}
          </Label>
        </div>
        {isReserving ? (
          <div className="grid gap-2">
            <Label htmlFor="customize-template-reserve-count">
              {m.import_template_reserve_count_label()}
            </Label>
            <Input
              id="customize-template-reserve-count"
              type="number"
              min={25}
              max={MAX_IMPORT_ROWS}
              step={25}
              className="sm:max-w-72"
              value={reserveCount}
              onChange={(event) => setReserveCount(event.target.value)}
              aria-invalid={isCountInvalid}
              aria-describedby={
                isCountInvalid
                  ? "customize-template-reserve-count-hint customize-template-reserve-count-error"
                  : "customize-template-reserve-count-hint"
              }
            />
            <p
              id="customize-template-reserve-count-hint"
              className="text-muted-foreground text-sm"
            >
              {m.import_template_reserve_count_hint({ max: MAX_IMPORT_ROWS })}
            </p>
            {isCountInvalid ? (
              <p
                id="customize-template-reserve-count-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {m.import_template_reserve_count_invalid({
                  max: MAX_IMPORT_ROWS,
                })}
              </p>
            ) : null}
          </div>
        ) : null}
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
