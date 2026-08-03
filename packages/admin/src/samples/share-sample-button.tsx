import type { User } from "@projet-igsn/domain/user/model";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@projet-igsn/design-system/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import { useRef, useState } from "react";

import { m } from "#/paraglide/messages.js";
import { useAddContributor } from "#/samples/use-add-contributor.ts";
import { useContributors } from "#/samples/use-contributors.ts";
import { useSearchUsers } from "#/samples/use-search-users.ts";
import { useUserRoleOnSample } from "#/samples/use-user-role-on-sample.ts";

const DEBOUNCE_MS = 300;

const fullName = ({ firstname, name }: User) =>
  [firstname, name].filter(Boolean).join(" ");

export function ShareSampleButton({ sampleId }: { sampleId: string }) {
  return useUserRoleOnSample(sampleId) === "owner" ? (
    <ShareSampleDialog sampleId={sampleId} />
  ) : null;
}

function ShareSampleDialog({ sampleId }: { sampleId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const contributors = useContributors(sampleId, isOpen);
  const found = useSearchUsers(search);
  const addContributor = useAddContributor(sampleId);

  const onType = (value: string) => {
    setTerm(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSearch(value), DEBOUNCE_MS);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          clearTimeout(timer.current);
          setTerm("");
          setSearch("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          {m.action_share()}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.share_dialog_title()}</DialogTitle>
          <DialogDescription>{m.share_dialog_description()}</DialogDescription>
        </DialogHeader>
        {contributors.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {m.share_contributors_empty()}
          </p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {contributors.data?.map((user) => (
              <li key={user.id}>
                {fullName(user)}{" "}
                <span className="text-muted-foreground">{user.email}</span>
              </li>
            ))}
          </ul>
        )}
        <Command
          shouldFilter={false}
          label={m.share_search_label()}
          className="border"
        >
          <CommandInput
            placeholder={m.share_search_placeholder()}
            value={term}
            onValueChange={onType}
          />
          <CommandList>
            {term !== "" && !found.isFetching ? (
              <CommandEmpty>{m.share_search_no_results()}</CommandEmpty>
            ) : null}
            {(found.data ?? []).map((user) => (
              <CommandItem
                key={user.id}
                value={user.id}
                onSelect={() => addContributor.mutate(user.id)}
              >
                {fullName(user)}
                <span className="text-muted-foreground">{user.email}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
