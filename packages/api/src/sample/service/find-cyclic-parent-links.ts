export type PendingParentLink = {
  childId: string;
  parentIds: readonly string[];
};

export function findCyclicParentLinks(
  links: readonly PendingParentLink[],
  descendantsOfChildren: ReadonlyMap<string, readonly string[]>,
): number[] {
  const pendingChildren = Map.groupBy(
    links.flatMap(({ childId, parentIds }) =>
      parentIds.map((parentId) => ({ parentId, childId })),
    ),
    ({ parentId }) => parentId,
  );
  const lineageOf = (rootId: string): Set<string> => {
    const lineage = new Set<string>();
    const pending = [rootId];
    for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
      if (lineage.has(id)) continue;
      lineage.add(id);
      pending.push(
        ...(descendantsOfChildren.get(id) ?? []),
        ...(pendingChildren.get(id) ?? []).map(({ childId }) => childId),
      );
    }
    return lineage;
  };
  return links.flatMap(({ childId, parentIds }, index) => {
    const lineage = lineageOf(childId);
    return parentIds.some((id) => lineage.has(id)) ? [index] : [];
  });
}
