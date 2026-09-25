import type { ExpressionBuilder } from "kysely";

import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";

import type { DB } from "../../db.ts";

import { LOCATION_COLUMNS } from "./to-location.ts";

const ACCOUNT_COLUMNS = ["user.firstname", "user.name", "user.orcid"] as const;

export function sampleLocationQuery(eb: ExpressionBuilder<DB, "sample">) {
  return jsonObjectFrom(
    eb
      .selectFrom("location")
      .select(LOCATION_COLUMNS)
      .whereRef("location.id", "=", "sample.location_id"),
  ).as("location");
}

export function sampleRelationsQuery(eb: ExpressionBuilder<DB, "sample">) {
  return jsonArrayFrom(
    eb
      .selectFrom("sample_relation")
      .selectAll("sample_relation")
      .whereRef("sample_relation.sample_id", "=", "sample.id")
      .orderBy("sample_relation.id"),
  ).as("relations");
}

export function sampleProcessStepsQuery(eb: ExpressionBuilder<DB, "sample">) {
  return jsonArrayFrom(
    eb
      .selectFrom("sample_process_step")
      .selectAll("sample_process_step")
      .whereRef("sample_process_step.sample_id", "=", "sample.id"),
  ).as("processSteps");
}

export function sampleMineralClassificationsQuery(
  eb: ExpressionBuilder<DB, "sample">,
) {
  return jsonArrayFrom(
    eb
      .selectFrom("mineral_classification")
      .selectAll("mineral_classification")
      .whereRef("mineral_classification.sample_id", "=", "sample.id"),
  ).as("mineralClassifications");
}

export function sampleAdditionalRolesQuery(
  eb: ExpressionBuilder<DB, "sample">,
) {
  return jsonArrayFrom(
    eb
      .selectFrom("sample_additional_role")
      .selectAll("sample_additional_role")
      .select((role) =>
        jsonObjectFrom(
          role
            .selectFrom("user")
            .select(ACCOUNT_COLUMNS)
            .whereRef("user.id", "=", "sample_additional_role.person_user_id"),
        ).as("account"),
      )
      .whereRef("sample_additional_role.sample_id", "=", "sample.id")
      .orderBy("sample_additional_role.id"),
  ).as("additionalRoles");
}

export function sampleManualGroupsQuery(eb: ExpressionBuilder<DB, "sample">) {
  return jsonArrayFrom(
    eb
      .selectFrom("sample_manual_group")
      .innerJoin(
        "manual_group",
        "manual_group.id",
        "sample_manual_group.group_id",
      )
      .select(["manual_group.id", "manual_group.name"])
      .whereRef("sample_manual_group.sample_id", "=", "sample.id")
      .orderBy("manual_group.name"),
  ).as("manualGroups");
}

export function sampleParentsQuery(eb: ExpressionBuilder<DB, "sample">) {
  return jsonArrayFrom(
    eb
      .selectFrom("sample_parent")
      .innerJoin("sample as parent", "parent.id", "sample_parent.parent_id")
      .select(["parent.id", "parent.igsn", "parent.name", "parent.material"])
      .whereRef("sample_parent.sample_id", "=", "sample.id")
      .orderBy("parent.name"),
  ).as("parents");
}

const personAccount = (
  eb: ExpressionBuilder<DB, "sample">,
  column:
    | "sc_chief_scientist_user_id"
    | "sc_collector_user_id"
    | "syn_operator_user_id",
) =>
  jsonObjectFrom(
    eb
      .selectFrom("user")
      .select(ACCOUNT_COLUMNS)
      .whereRef("user.id", "=", `sample.${column}`),
  );

export function samplePersonAccountsQuery(eb: ExpressionBuilder<DB, "sample">) {
  return [
    personAccount(eb, "sc_chief_scientist_user_id").as("chiefScientistAccount"),
    personAccount(eb, "sc_collector_user_id").as("collectorAccount"),
    personAccount(eb, "syn_operator_user_id").as("operatorAccount"),
  ];
}

export function sampleOwnerQuery(eb: ExpressionBuilder<DB, "sample">) {
  return jsonObjectFrom(
    eb
      .selectFrom("user_sample")
      .innerJoin("user", "user.id", "user_sample.user_id")
      .select(["user.name", "user.firstname", "user.status"])
      .whereRef("user_sample.sample_id", "=", "sample.id")
      .where("user_sample.role", "=", "owner")
      .limit(1),
  ).as("owner");
}

export function sampleAttachmentsQuery(eb: ExpressionBuilder<DB, "sample">) {
  return jsonArrayFrom(
    eb
      .selectFrom("sample_attachment")
      .selectAll("sample_attachment")
      .whereRef("sample_attachment.sample_id", "=", "sample.id")
      .orderBy("sample_attachment.id"),
  ).as("attachments");
}
