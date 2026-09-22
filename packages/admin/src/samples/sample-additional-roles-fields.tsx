import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@projet-igsn/design-system/components/ui/dropdown-menu";
import { ADDITIONAL_ROLES } from "@projet-igsn/domain/sample/additional-role/role";
import { ChevronDownIcon, Trash2 } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { ContactNameFields } from "#/samples/contact-name-fields.tsx";
import { EMPTY_ADDITIONAL_ROLE_DRAFT } from "#/samples/sample-draft-schema.ts";
import { additionalRoleLabel } from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const ROLES_FIELD = "scientificContext.additionalRoles";

export function SampleAdditionalRolesFields() {
  const form = useSampleForm();
  const isDisabled = useIsFieldDisabled(ROLES_FIELD);
  return (
    <div className="grid gap-4">
      <form.Subscribe
        selector={(state) => state.values.scientificContext.additionalRoles}
      >
        {(roles) => (
          <>
            {isDisabled && roles.length === 0 ? null : (
              <p className="font-medium">{m.legend_additional_roles()}</p>
            )}
            {roles.map((row, index) => (
              <div key={row.key} className="relative rounded-lg border p-4">
                <ContactNameFields
                  label={m.legend_additional_role({
                    index: index + 1,
                    role: additionalRoleLabel(row.role),
                  })}
                  person={`${ROLES_FIELD}[${index}].person`}
                  orcidName={`${ROLES_FIELD}[${index}].personOrcid`}
                  requiredToPublish
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  disabled={isDisabled}
                  aria-label={m.action_remove_additional_role({
                    index: index + 1,
                  })}
                  onClick={() => form.removeFieldValue(ROLES_FIELD, index)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
          </>
        )}
      </form.Subscribe>
      {isDisabled ? null : (
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline">
                {m.action_add_additional_role()}
                <ChevronDownIcon aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {ADDITIONAL_ROLES.map((role) => (
                <DropdownMenuItem
                  key={role}
                  onSelect={() =>
                    form.pushFieldValue(ROLES_FIELD, {
                      key: crypto.randomUUID(),
                      role,
                      ...EMPTY_ADDITIONAL_ROLE_DRAFT,
                    })
                  }
                >
                  {additionalRoleLabel(role)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
