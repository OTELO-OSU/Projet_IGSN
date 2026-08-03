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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@projet-igsn/design-system/components/ui/popover";
import { ChevronsUpDownIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "react-oidc-context";

import { m } from "#/paraglide/messages.js";
import { useAddContributor } from "#/samples/use-add-contributor.ts";
import { useContributors } from "#/samples/use-contributors.ts";
import {
  MIN_SEARCH_LENGTH,
  useSearchUsers,
} from "#/samples/use-search-users.ts";
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
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const contributors = useContributors(sampleId, isOpen);
  const found = useSearchUsers(search, isOpen);
  const addContributor = useAddContributor(sampleId);
  // ponytail: only the owner opens this dialog (the button and both endpoints
  // are owner-gated), so the signed-in identity IS the owner. Read the owner
  // off the sample response the day a contributor gets to see this list.
  const ownerEmail = useAuth().user?.profile.email;

  const resetSearch = () => {
    clearTimeout(timer.current);
    setTerm("");
    setSearch("");
  };

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
          setIsPickerOpen(false);
          resetSearch();
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
        <section className="grid gap-1">
          <h3 className="text-sm font-medium">{m.share_owner_label()}</h3>
          <p className="text-muted-foreground text-sm">{ownerEmail}</p>
        </section>
        <section className="grid gap-1">
          <h3 className="text-sm font-medium">
            {m.share_collaborators_label()}
          </h3>
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
        </section>
        <Popover
          open={isPickerOpen}
          onOpenChange={(open) => {
            setIsPickerOpen(open);
            if (!open) resetSearch();
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-label={m.share_search_label()}
              aria-expanded={isPickerOpen}
              className="w-full justify-between font-normal"
            >
              {m.share_search_label()}
              <ChevronsUpDownIcon className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
            {/* The trigger already answers to "search a colleague", so the input
                takes its own name: two comboboxes sharing one is ambiguous. */}
            <Command shouldFilter={false} label={m.share_search_placeholder()}>
              <CommandInput
                placeholder={m.share_search_placeholder()}
                value={term}
                onValueChange={onType}
              />
              <CommandList label={m.share_suggestions_label()}>
                {search.length >= MIN_SEARCH_LENGTH && !found.isFetching ? (
                  <CommandEmpty>{m.share_search_no_results()}</CommandEmpty>
                ) : null}
                {(found.data ?? []).map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => {
                      addContributor.mutate(user.id);
                      setIsPickerOpen(false);
                    }}
                  >
                    {fullName(user)}
                    <span className="text-muted-foreground">{user.email}</span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </DialogContent>
    </Dialog>
  );
}
