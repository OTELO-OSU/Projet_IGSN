export type ModerationScope = {
  callerId: string;
  superAdmin: boolean;
  managedLaboratories: string[];
};

export const superAdminScope = (callerId: string): ModerationScope => ({
  callerId,
  superAdmin: true,
  managedLaboratories: [],
});
