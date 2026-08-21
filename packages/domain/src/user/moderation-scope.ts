export type ModerationScope = {
  callerId: string;
  superAdmin: boolean;
  managedLaboratories: string[];
  managedManualGroupIds: string[];
};

export const superAdminScope = (callerId: string): ModerationScope => ({
  callerId,
  superAdmin: true,
  managedLaboratories: [],
  managedManualGroupIds: [],
});
