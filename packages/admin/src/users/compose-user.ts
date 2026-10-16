import type {
  AdminUser,
  UpdateUser,
} from "@projet-igsn/domain/user/user-validator";

export const toUserDraft = (user: AdminUser) => ({
  status: user.status,
  institutionalOrganization: user.institutionalOrganization,
  institutionalOsu: user.institutionalOsu,
  institutionalLaboratory: user.institutionalLaboratory,
  manualGroupIds: user.manualGroups.map((group) => group.id),
  managedGroups: user.managedGroups,
  superAdmin: user.superAdmin,
});

export type UserDraft = ReturnType<typeof toUserDraft>;

export const composeUser = (draft: UpdateUser): UpdateUser => ({
  ...draft,
  institutionalOrganization: draft.institutionalOrganization ?? null,
  institutionalOsu: draft.institutionalOsu ?? null,
  institutionalLaboratory: draft.institutionalLaboratory ?? null,
});
