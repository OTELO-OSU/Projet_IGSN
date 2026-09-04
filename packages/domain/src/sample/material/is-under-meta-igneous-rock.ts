// the meta-igneous branch reuses the igneous nodes, so its labels take a prefix to tell them apart
export function isUnderMetaIgneousRock(path: string): boolean {
  return path.split(".").slice(0, -1).includes("meta_igneous_rock");
}
