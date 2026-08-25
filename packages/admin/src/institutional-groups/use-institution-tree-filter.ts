import type { InstitutionKind } from "@projet-igsn/domain/institutional-group/institution-filter";

import { parseInstitutionFilter } from "@projet-igsn/domain/institutional-group/institution-filter";
import {
  laboratoryLabel,
  organizationLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";
import { useState } from "react";

import type { InstitutionNode } from "#/institutional-groups/institution-tree-nodes.ts";

import {
  filterNodes,
  INSTITUTION_TREE,
} from "#/institutional-groups/institution-tree-nodes.ts";
import { m } from "#/paraglide/messages.js";

const LABEL_BY_KIND: Record<InstitutionKind, (code: string) => string> = {
  organization: organizationLabel,
  osu: osuLabel,
  laboratory: laboratoryLabel,
};

export type InstitutionRowsState = {
  selected: string | undefined;
  expandedKeys: Set<string>;
  isSearching: boolean;
  toggle: (key: string) => void;
  select: (value: string | undefined) => void;
};

export function useInstitutionTreeFilter(
  value: string | undefined,
  onChange: (value: string | undefined) => void,
): {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  search: string;
  setSearch: (search: string) => void;
  label: string;
  nodes: InstitutionNode[];
  rows: InstitutionRowsState;
} {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedKeys, setExpandedKeys] = useState(new Set<string>());
  const parsed = value === undefined ? null : parseInstitutionFilter(value);

  const select = (next: string | undefined) => {
    onChange(next);
    setIsOpen(false);
  };

  const toggle = (key: string) =>
    setExpandedKeys((previous) => {
      const next = new Set(previous);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return {
    isOpen,
    setIsOpen,
    search,
    setSearch,
    label: parsed
      ? LABEL_BY_KIND[parsed.kind](parsed.code)
      : m.filter_institution_any(),
    nodes: filterNodes(INSTITUTION_TREE, search),
    rows: {
      selected: value,
      expandedKeys,
      isSearching: search !== "",
      toggle,
      select,
    },
  };
}
