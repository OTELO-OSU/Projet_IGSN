import type { OrphanedGroup } from "@projet-igsn/domain/user/orphaned-group";

const INSTITUTIONAL_PATHS = {
  organization: "organizations",
  osu: "osus",
  laboratory: "laboratories",
};

export function groupPageUrl(group: OrphanedGroup, adminUrl: string): string {
  const path =
    group.kind === "manual"
      ? `/manual-groups/${group.id}`
      : `/institutional-groups/${INSTITUTIONAL_PATHS[group.kind]}/${group.code}`;
  return new URL(path, adminUrl).toString();
}
