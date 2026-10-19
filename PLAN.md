# Manager-only manual groups in admin Settings

## Context

- Settings reads manual groups from `GET /admin/currentUser/manual-groups` (`listUserManualGroups`), which returns only the groups the user is a member of.
- A user who manages a group without being a member therefore gets no samples link for it in Settings > Profile, and the group is missing from Settings > Groups.
- Goal: show those groups in both places, the same way member groups are shown.

## Approach (admin only, no API change)

- `useCurrentUser()` already returns `managedManualGroups: { id, name }[]` (`domain/src/user/current-user.ts`), and both routes have it in `data`.
- Pass it as a prop and merge it client-side with the member list, member entries winning on duplicate ids.
- The membership endpoint keeps meaning "groups I belong to": its other consumer, the "My samples" manual-group filter (`manual-group-filter.tsx`, `mine: true`), only matches member groups.

### Profile: `packages/admin/src/settings/group-samples-link.tsx`

- Add a prop `managedGroups: ManualGroup[]`.
- `groups` = member groups, plus the managed groups whose id is not among them, sorted by `name` with `localeCompare`.
- Single-group label, combobox and hide-when-empty logic stay as they are.
- `routes/settings.profile.tsx`: `<GroupSamplesLink managedGroups={data.managedManualGroups} />`.

### Groups: `packages/admin/src/manual-groups/my-manual-groups.tsx`

- Add the same prop.
- Rows: member groups unchanged (Leave button, locked tooltip), then managed-only groups (id not in the member list) showing a muted `Manager` label in the button slot, all sorted by name.
- Hide the section only when both lists are empty.
- After leaving a group they also manage, the user still sees it as a manager row, since that row is derived from the refetched member list.
- `routes/settings.groups.tsx`: `<MyManualGroups managedGroups={data.managedManualGroups} />`.
- `packages/admin/messages/en.json`: add `"manual_group_manager_badge": "Manager"` after `manual_group_leave_locked` (admin is English only).

## Tests (TDD, Vitest browser)

- `packages/admin/src/settings/profile-page.spec.tsx`: with `manualGroups: []` and `me.managedManualGroups: [FOSSIL_TEAM]`, it offers the "Fossil team samples link" pointing to `manualGroup=<id>`. With one member group and a different managed one, the combobox offers both. A group that is both member and managed appears once.
- `packages/admin/src/settings/groups-page.spec.tsx`: let `fakeApi` take `managedManualGroups`. A manager-only group is listed in the "Manual groups" region with "Manager" and no "Leave Fossil team" button. The section shows when the user manages a group but is a member of none.

## Verification

- `pnpm test packages/admin/src/settings`
- `pnpm lint:check --quiet`, `pnpm fmt:check`

## Cleanup

- Delete `PLAN.md` from the repo root in the last commit.
