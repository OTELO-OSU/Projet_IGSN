import type {
  DuplicateCriteria,
  SuspectedDuplicate,
} from "@projet-igsn/domain/sample/publication/suspected-duplicate";

import { duplicateCheckCriteria } from "@projet-igsn/domain/sample/publication/suspected-duplicate";

import type { CheckedUpdate } from "./check-service-update.ts";
import type {
  CheckedCreate,
  ServiceSampleChecksDeps,
} from "./service-sample-checks.ts";

const suspectedDuplicates = (
  samples: ServiceSampleChecksDeps["samples"],
  criteria: DuplicateCriteria | null,
  exclude?: string,
): Promise<SuspectedDuplicate[]> =>
  criteria === null
    ? Promise.resolve([])
    : samples.findDuplicates(criteria, exclude);

export const createDuplicates = (
  samples: ServiceSampleChecksDeps["samples"],
  { input }: CheckedCreate,
  confirmed: boolean | undefined,
): Promise<SuspectedDuplicate[]> =>
  suspectedDuplicates(samples, duplicateCheckCriteria(input, { confirmed }));

export const updateDuplicates = (
  samples: ServiceSampleChecksDeps["samples"],
  { current, merged }: CheckedUpdate,
  confirmed: boolean | undefined,
): Promise<SuspectedDuplicate[]> =>
  suspectedDuplicates(
    samples,
    duplicateCheckCriteria(merged, { previous: current, confirmed }),
    current.id,
  );
