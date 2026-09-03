import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    update sample
    set storage_conditions = nullif(
      array_remove(coalesce(storage_conditions, '{}'), 'no_specific_condition')
      || case
        when temperature_type is not null
          and not (coalesce(storage_conditions, '{}') @> '{temperature_controlled}')
        then '{temperature_controlled}'::text[]
        else '{}'::text[]
      end
      || case
        when pressure_type is not null
          and not (coalesce(storage_conditions, '{}') @> '{pressure_controlled}')
        then '{pressure_controlled}'::text[]
        else '{}'::text[]
      end
      || case
        when humidity_type is not null
          and not (coalesce(storage_conditions, '{}') @> '{moisture_controlled}')
        then '{moisture_controlled}'::text[]
        else '{}'::text[]
      end
      || case
        when light is not null
          and not (coalesce(storage_conditions, '{}') @> '{light_controlled}')
        then '{light_controlled}'::text[]
        else '{}'::text[]
      end,
      '{}'::text[]
    )
    where storage_conditions @> '{no_specific_condition}'
      or temperature_type is not null
      or pressure_type is not null
      or humidity_type is not null
      or light is not null
  `.execute(db);
  await sql`
    update sample
    set specific_conditions = null
    where storage_conditions is null and specific_conditions is not null
  `.execute(db);
}

export async function down(): Promise<void> {}
