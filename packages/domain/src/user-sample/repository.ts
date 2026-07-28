// A user_sample row links a user to a sample: a row means owner, and one
// sample can have several users (ADR 0019).
export type UserSampleRepository = {
  addOwner(sampleId: string, userId: string): Promise<void>;
};
