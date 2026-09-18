import type { SampleProcessStep } from "@projet-igsn/domain/sample/process-step/model";

import { HTTPException } from "hono/http-exception";
import { v7 as uuidv7 } from "uuid";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { hasParent } from "./has-parent.ts";

export const PROCESS_STEPS_NEED_PARENT =
  "Process steps require a parent sample";

export async function replaceSampleProcessSteps(
  db: Transactional<DB>,
  sampleId: string,
  steps: SampleProcessStep[],
): Promise<void> {
  if (steps.length > 0 && !(await hasParent(db, sampleId))) {
    throw new HTTPException(422, { message: PROCESS_STEPS_NEED_PARENT });
  }
  await db
    .deleteFrom("sample_process_step")
    .where("sample_id", "=", sampleId)
    .execute();
  if (steps.length === 0) return;
  await db
    .insertInto("sample_process_step")
    .values(
      steps.map(({ kind, date, description }) => ({
        id: uuidv7(),
        sample_id: sampleId,
        kind,
        date_start: date?.start ?? null,
        date_end: date?.end ?? null,
        date_precision: date?.precision ?? null,
        date_time_zone: date?.precision === "hour" ? date.timeZone : null,
        description: description ?? null,
      })),
    )
    .execute();
}
