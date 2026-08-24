export function canModerateUsers(me: {
  superAdmin: boolean;
  managedLaboratories: string[];
}): boolean {
  return me.superAdmin || me.managedLaboratories.length > 0;
}
