// the meta-igneous and meta-sedimentary branches graft the igneous and sedimentary nodes, so their labels take a prefix to tell them apart
const META_ROCK_SEGMENTS = ["meta_igneous_rock", "meta_sedimentary_rock"];

export function isUnderMetaRock(path: string): boolean {
  const ancestors = path.split(".").slice(0, -1);
  return META_ROCK_SEGMENTS.some((segment) => ancestors.includes(segment));
}
