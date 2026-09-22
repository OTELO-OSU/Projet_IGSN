import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { withRequired } from "@projet-igsn/design-system/lib/with-required";
import { UserRoundSearchIcon } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { isTypedContact } from "#/samples/compose-contact.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";
import { ContactNamePicker } from "#/users/contact-name-picker.tsx";

type ContactPerson =
  | "scientificContext.chiefScientist"
  | "scientificContext.collector"
  | "scientificContext.collectionCurator"
  | "syntheticDetails.operator"
  | `scientificContext.additionalRoles[${number}].person`;

type ContactOrcidName =
  | "scientificContext.chiefScientistOrcid"
  | "scientificContext.collectorOrcid"
  | "syntheticDetails.operatorOrcid"
  | `scientificContext.additionalRoles[${number}].personOrcid`;

export function ContactNameFields({
  label,
  person,
  orcidName,
  requiredToPublish = false,
}: {
  label: string;
  person: ContactPerson;
  orcidName?: ContactOrcidName;
  requiredToPublish?: boolean;
}) {
  const form = useSampleForm();
  const userIdName = `${person}UserId` as const;
  const firstnameName = `${person}Firstname` as const;
  const lastnameName = `${person}Lastname` as const;
  const isFrozen = useIsFieldDisabled(userIdName);
  const [isTyped, setIsTyped] = useState(() =>
    isTypedContact({
      userId: form.getFieldValue(userIdName),
      firstname: form.getFieldValue(firstnameName),
      lastname: form.getFieldValue(lastnameName),
      orcid: orcidName ? form.getFieldValue(orcidName) : null,
    }),
  );

  const clearTypedNames = () => {
    form.setFieldValue(firstnameName, undefined);
    form.setFieldValue(lastnameName, undefined);
    if (orcidName) form.setFieldValue(orcidName, undefined);
  };

  const typedNames = (
    <div
      className={`grid gap-4 ${orcidName ? "sm:grid-cols-[1fr_1fr_1fr_auto]" : "sm:grid-cols-[1fr_1fr_auto]"}`}
    >
      <form.AppField name={firstnameName}>
        {(field) => (
          <field.TextField
            label={m.field_firstname()}
            requiredToPublish={requiredToPublish}
          />
        )}
      </form.AppField>

      <form.AppField name={lastnameName}>
        {(field) => (
          <field.TextField
            label={m.field_lastname()}
            requiredToPublish={requiredToPublish}
          />
        )}
      </form.AppField>

      {orcidName ? (
        <form.AppField name={orcidName}>
          {(field) => <field.TextField label={m.field_orcid()} />}
        </form.AppField>
      ) : null}

      {isFrozen ? null : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="self-end"
              aria-label={m.contact_name_search_action()}
              onClick={() => {
                clearTypedNames();
                setIsTyped(false);
              }}
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
        <>
          <Label htmlFor={userIdName} className="sr-only">
            {label}
          </Label>
          <ContactNamePicker
            id={userIdName}
            userId={field.state.value}
            onChange={(user) => field.handleChange(user?.id)}
            onFreeText={() => {
              field.handleChange(undefined);
              setIsTyped(true);
            }}
          />
        </>
      )}
    </form.AppField>
  );

  return (
    <fieldset className="grid gap-4">
      <legend className="mb-2 font-medium">
        {withRequired(label, requiredToPublish)}
      </legend>
      {isFrozen || isTyped ? typedNames : picker}
    </fieldset>
  );
}
