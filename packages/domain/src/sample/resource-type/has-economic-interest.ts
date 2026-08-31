export type EconomicInterestFields = {
  resourceType?: string | null;
  economicInterestElements?: string[];
  economicResourceTypePrecision?: string | null;
  economicDepositName?: string | null;
  economicDepositDescription?: string | null;
};

export function hasEconomicInterest({
  resourceType,
  economicInterestElements,
  economicResourceTypePrecision,
  economicDepositName,
  economicDepositDescription,
}: EconomicInterestFields): boolean {
  return Boolean(
    resourceType ||
    economicInterestElements?.length ||
    economicResourceTypePrecision ||
    economicDepositName ||
    economicDepositDescription,
  );
}
