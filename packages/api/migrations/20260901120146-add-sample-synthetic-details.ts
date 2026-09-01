import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("syn_starting_material_nature", sql`text`)
    .addColumn("syn_starting_material_form", sql`text`)
    .addColumn("syn_starting_material_composition", sql`text`)
    .addColumn("syn_final_product", sql`text`)
    .addColumn("syn_experiment_type", sql`text`)
    .addColumn("syn_experiment_duration_value", sql`double precision`)
    .addColumn("syn_experiment_duration_unit", sql`text`)
    .addColumn("syn_experiment_duration_not_relevant", sql`boolean`)
    .addColumn("syn_synthesis_date_start", sql`date`)
    .addColumn("syn_synthesis_date_end", sql`date`)
    .addColumn("syn_operator_name", sql`text`)
    .addColumn("syn_operator_orcid", sql`text`)
    .addColumn("syn_research_structure", sql`text[]`)
    .addColumn("syn_temperature_value", sql`double precision`)
    .addColumn("syn_temperature_unit", sql`text`)
    .addColumn("syn_pressure_value", sql`double precision`)
    .addColumn("syn_pressure_unit", sql`text`)
    .addColumn("syn_experimental_protocol", sql`text`)
    .addColumn("syn_experiment_purpose", sql`text`)
    .addColumn("syn_equipment_used", sql`text`)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("syn_starting_material_nature")
    .dropColumn("syn_starting_material_form")
    .dropColumn("syn_starting_material_composition")
    .dropColumn("syn_final_product")
    .dropColumn("syn_experiment_type")
    .dropColumn("syn_experiment_duration_value")
    .dropColumn("syn_experiment_duration_unit")
    .dropColumn("syn_experiment_duration_not_relevant")
    .dropColumn("syn_synthesis_date_start")
    .dropColumn("syn_synthesis_date_end")
    .dropColumn("syn_operator_name")
    .dropColumn("syn_operator_orcid")
    .dropColumn("syn_research_structure")
    .dropColumn("syn_temperature_value")
    .dropColumn("syn_temperature_unit")
    .dropColumn("syn_pressure_value")
    .dropColumn("syn_pressure_unit")
    .dropColumn("syn_experimental_protocol")
    .dropColumn("syn_experiment_purpose")
    .dropColumn("syn_equipment_used")
    .execute();
}
