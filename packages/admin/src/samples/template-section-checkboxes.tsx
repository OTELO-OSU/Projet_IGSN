import { Checkbox } from "@projet-igsn/design-system/components/ui/checkbox";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import {
  TEMPLATE_SECTION_KEYS,
  type TemplateSectionKey,
} from "@projet-igsn/domain/sample/import/import-validator";

import { m } from "#/paraglide/messages.js";

const SECTION_LABELS: Record<TemplateSectionKey, () => string> = {
  physicalDescription: m.tab_physical_description,
  age: m.tab_age,
  conservationSecurity: m.tab_conservation_security,
  repository: m.tab_curation_repository,
  relatedDocuments: m.tab_related_resources,
  geologicalContext: m.section_geological_context,
};

export function TemplateSectionCheckboxes({
  sections,
  onChange,
}: {
  sections: Record<TemplateSectionKey, boolean>;
  onChange: (sections: Record<TemplateSectionKey, boolean>) => void;
}) {
  return TEMPLATE_SECTION_KEYS.map((key) => (
    <div key={key} className="flex items-center gap-2">
      <Checkbox
        id={`customize-template-section-${key}`}
        checked={sections[key]}
        onCheckedChange={(checked) =>
          onChange({ ...sections, [key]: checked === true })
        }
      />
      <Label htmlFor={`customize-template-section-${key}`}>
        {m.import_template_include_section({
          section: SECTION_LABELS[key](),
        })}
      </Label>
    </div>
  ));
}
