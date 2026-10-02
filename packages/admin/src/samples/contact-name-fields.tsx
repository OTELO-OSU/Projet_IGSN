import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { useFieldRequiredRule } from "@projet-igsn/design-system/components/form/field-required-context";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { cn } from "@projet-igsn/design-system/lib/utils";
import { withRequired } from "@projet-igsn/design-system/lib/with-required";
import { UserRoundSearchIcon } from "lucide-react";
import { type ReactNode } from "react";

import { m } from "#/paraglide/messages.js";
import { isTypedPerson } from "#/samples/compose-contact.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";
import { ContactNamePicker } from "#/users/contact-name-picker.tsx";

type ContactPerson =
  | "scientificContext.chiefScientist"
  | "scientificContext.collector"
  | "syntheticDetails.operator"
  | `scientificContext.additionalRoles[${number}].person`;

export function ContactNameFields({
  label,
  person,
  selfFirst,
  action,
}: {
  label: string;
  person: ContactPerson;
  selfFirst?: boolean;
  action?: ReactNode;
}) {
  const form = useSampleForm();
  const userIdName = `${person}UserId` as const;
  const firstnameName = `${person}Firstname` as const;
  const lastnameName = `${person}Lastname` as const;
  const isFrozen = useIsFieldDisabled(userIdName);
  const isRequired = useFieldRequiredRule();

  const clearTypedNames = () => {
    form.setFieldValue(firstnameName, undefined);
    form.setFieldValue(lastnameName, undefined);
  };

  const typedNames = (
    <div className="grid gap-4 sm:flex sm:flex-wrap">
      <form.AppField name={firstnameName}>
        {(field) => <field.TextField label={m.field_firstname()} />}
      </form.AppField>

      <form.AppField name={lastnameName}>
        {(field) => <field.TextField label={m.field_lastname()} />}
      </form.AppField>

      {isFrozen ? null : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="self-end"
              aria-label={m.contact_name_search_action()}
              onClick={clearTypedNames}
            >
              <UserRoundSearchIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{m.contact_name_search_action()}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  const picker = (
    <form.AppField name={userIdName}>
      {(field) => (
        <div className="grid w-full gap-2 sm:w-72">
          <Label htmlFor={userIdName}>
            {withRequired(label, isRequired(userIdName))}
          </Label>
          <ContactNamePicker
            id={userIdName}
            userId={field.state.value}
            selfFirst={selfFirst}
            onChange={(user) => field.handleChange(user?.id)}
            onFreeText={() => {
              field.handleChange(undefined);
              form.setFieldValue(firstnameName, "");
            }}
          />
        </div>
      )}
    </form.AppField>
  );

  return (
    <form.Subscribe
      selector={(state) => !isFrozen && !isTypedPerson(state.values, person)}
    >
      {(isPicker) => (
        <div className="relative">
          <fieldset className="grid gap-4">
            <legend
              className={cn(
                isPicker ? "sr-only" : "mb-2 font-medium",
                action && "pr-10",
              )}
            >
              {label}
            </legend>
            {isPicker ? picker : typedNames}
          </fieldset>
          {action ? (
            <div
              className={cn(
                "absolute right-0",
                isPicker ? "-top-3" : "-top-1.5",
              )}
            >
              {action}
            </div>
          ) : null}
        </div>
      )}
    </form.Subscribe>
  );
}
