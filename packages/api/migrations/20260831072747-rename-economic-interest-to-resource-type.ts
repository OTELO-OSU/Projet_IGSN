import { type Kysely, sql } from "kysely";

const ELIGIBLE_MATERIAL = sql`
  material <@ 'rock.igneous'
  or material <@ 'rock.metamorphic'
  or material <@ 'rock.sedimentary'
  or material <@ 'rock.hydrothermal'
  or material <@ 'sediment'
`;

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .renameColumn("economic_interest", "resource_type")
    .execute();
  await sql`
    update sample set resource_type =
      case when nlevel(resource_type) > 1 then subpath(resource_type, 1) end
    where resource_type is not null
  `.execute(db);
  await sql`
    update sample set
      resource_type = null,
      economic_interest_elements = null,
      economic_resource_type_precision = null,
      economic_deposit_name = null,
      economic_deposit_description = null
    where material is null or not (${ELIGIBLE_MATERIAL})
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .renameColumn("resource_type", "economic_interest")
    .execute();
  await sql`
    update sample set economic_interest = case
      when economic_interest is null then 'yes'::ltree
      else 'yes'::ltree || economic_interest
    end
    where economic_interest is not null
      or economic_interest_elements is not null
      or economic_resource_type_precision is not null
      or economic_deposit_name is not null
      or economic_deposit_description is not null
  `.execute(db);
}
