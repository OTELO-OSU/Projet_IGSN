import { type Kysely, sql } from "kysely";

const LABORATORY_IDS = {
  EA4038: "200615287V",
  FR2424: "200119846X",
  FR2952: "200710692W",
  FR3724: "201522729V",
  FR3761: "201622338R",
  FR636: "200610636P",
  IRL3376: "201119743S",
  IRL3386: "201119742R",
  "UAR 2050": "202524628R",
  UAR2050: "202524628R",
  UAR2074: "199921733G",
  UAR2201: "200610854B",
  UAR2202: "200410855L",
  UAR2276: "200421737P",
  UAR2567: "200310864A",
  UAR2572: "200320524A",
  UAR2859: "200420526Y",
  UAR2877: "200620527R",
  UAR2928: "200521739M",
  UAR3113: "200810872M",
  UAR3116: "200810873N",
  UAR3245: "201120530X",
  UAR3281: "201420664E",
  UAR3282: "200919527R",
  UAR3342: "201020686W",
  UAR3343: "201220716V",
  UAR3365: "201020888R",
  UAR3454: "201220893M",
  UAR3455: "201220920S",
  UAR3470: "201220900V",
  UAR3538: "201220901W",
  UAR3562: "201320582V",
  UAR3563: "201320583W",
  UAR3721: "201521823K",
  UAR704: "199519805D",
  UAR830: "199320515J",
  UAR831: "200719584L",
  UAR832: "200310841A",
  UAR833: "200810842E",
  UAR855: "199521753W",
  UMI3351: "201019744X",
  UMI3376: "201119743S",
  UMI3386: "201119742R",
  "UMR 8254": "202524644H",
  "UMR 8262": "202524635Y",
  UMR1114: "199917981D",
  UMR3589: "201320566C",
  UMR5001: "201722374A",
  UMR5031: "196817561G",
  UMR5110: "199911795E",
  UMR5126: "200317531X",
  UMR5150: "200311828Y",
  UMR5151: "199512007C",
  UMR5193: "200311864M",
  UMR5194: "200311865N",
  UMR5204: "200511874P",
  UMR5205: "200511875R",
  UMR5213: "200711882P",
  UMR5243: "200711908T",
  UMR5256: "200711921G",
  UMR5263: "200711926M",
  UMR5274: "201119432D",
  UMR5275: "201119454C",
  UMR5276: "201119400U",
  UMR5277: "201119477C",
  UMR5299: "201119459H",
  UMR5302: "201220448D",
  UMR5318: "201622384R",
  UMR5560: "199512000V",
  UMR5563: "201119478D",
  UMR5566: "200317685P",
  UMR5569: "199512007C",
  UMR5574: "199512012H",
  UMR5602: "199512032E",
  UMR5804: "199712084C",
  UMR5805: "199512085M",
  UMR6016: "200012116Z",
  UMR6112: "200012185Z",
  UMR6118: "200012191F",
  UMR6143: "200012210B",
  UMR6164: "200212224H",
  UMR6213: "200712259Z",
  UMR6249: "200812285Y",
  UMR6251: "200812287A",
  UMR6266: "200812294H",
  UMR6294: "201220340L",
  UMR6502: "199612297N",
  UMR6523: "200816947R",
  UMR6524: "200817617U",
  UMR6538: "199612326V",
  UMR6539: "200816948S",
  UMR6553: "199612339J",
  UMR6554: "local:UMR6554",
  UMR7093: "200112481S",
  UMR7095: "200112483U",
  UMR7144: "200512529B",
  UMR7154: "200512539M",
  UMR7158: "200919203N",
  UMR7159: "200918490N",
  UMR7164: "200512546V",
  UMR7193: "200918450V",
  UMR7202: "200918564U",
  UMR7208: "200919362L",
  UMR7250: "201220434N",
  UMR7266: "201220407J",
  UMR7285: "201220398Z",
  UMR7293: "201220431K",
  UMR7294: "201220349W",
  UMR7300: "201220240C",
  UMR7326: "201220274P",
  UMR7327: "201220213Y",
  UMR7328: "201220223J",
  UMR7329: "200816914E",
  UMR7330: "201220322S",
  UMR7331: "201220207S",
  UMR7358: "201320574L",
  UMR7359: "201320575M",
  UMR7360: "201320576N",
  UMR7372: "201420642F",
  UMR7550: "199712602R",
  UMR7583: "199412629H",
  UMR7590: "199712636C",
  UMR7608: "199712653W",
  UMR7621: "199712666K",
  UMR7648: "201019049S",
  UMR8023: "201922973T",
  UMR8067: "200924698L",
  UMR8105: "200212762T",
  UMR8109: "200212766X",
  UMR8148: "200412804E",
  UMR8187: "200812834V",
  UMR8190: "200918434C",
  UMR8212: "200611689J",
  UMR8217: "201220423B",
  UMR8247: "201420753B",
  UMR8254: "202524644H",
  UMR8255: "202524639C",
  UMR8262: "202524635Y",
  UMR8518: "199812847C",
  UMR8538: "199812866Y",
  UMR8539: "199812867Z",
  UMR8617: "199812942F",
  UMR9189: "201521249L",
  UMR9220: "201521701C",
  UPR3079: "200017654U",
  UPR3266: "198318600W",
  UPR3346: "201019365K",
  UPR4301: "196717612S",
  UPR8641: "196817561G",
  UPS2074: "199921733G",
  UPS2776: "200421737P",
  UPS2928: "200521739M",
  UPS855: "199521753W",
  USR3278: "201019121V",
};

const OSU_IDS = {
  "Ecce Terra": "201220920S",
  EFLUVE: "201320583W",
  EOST: "199320515J",
  IAP: "200112483U",
  IPGP: "201220893M",
  IUEM: "200810872M",
  OASU: "200222184J",
  ObAS: "199712602R",
  OBSPM: "200610854B",
  OCA: "200410855L",
  OMP: "200719584L",
  OPGC: "200810842E",
  OREME: "200919527R",
  OSERen: "201220716V",
  "OSU-Externe": "local:OSU-Externe",
  "OSU-Réunion": "201020888R",
  OSUC: "200810873N",
  OSUG: "200310841A",
  OSUL: "201521823K",
  OSUNA: "201420664E",
  OSUPS: "202324364M",
  OTELo: "201320582V",
  OVSQ: "201020686W",
  PYTHEAS: "201220900V",
  STAMAR: "202023501M",
  THETA: "201120530X",
};

const STORED_COLUMNS = [
  [
    "user",
    [
      ["institutional_osu", OSU_IDS],
      ["institutional_laboratory", LABORATORY_IDS],
    ],
  ],
  [
    "sample",
    [
      ["institutional_osu", OSU_IDS],
      ["institutional_laboratory", LABORATORY_IDS],
      ["rep_current_archive_osu", OSU_IDS],
      ["rep_current_archive_laboratory", LABORATORY_IDS],
    ],
  ],
] as const;

const MANAGED_GROUP_TABLES = [
  ["user_managed_institutional_group", "user_id"],
  ["service_account_managed_institutional_group", "service_account_id"],
] as const;

const MANAGED_KINDS = [
  ["osu", OSU_IDS],
  ["laboratory", LABORATORY_IDS],
] as const;

const storedIds = (ids: Record<string, string>) =>
  sql`(values ${sql.join(
    Object.entries(ids).map(([code, id]) => sql`(${code}, ${id})`),
  )}) as stored (code, id)`;

const idOf = (column: string, ids: Record<string, string>) =>
  sql`(${JSON.stringify(ids)}::text::jsonb ->> ${sql.ref(column)})`;

export async function up<Database>(db: Kysely<Database>): Promise<void> {
  for (const [table, columns] of STORED_COLUMNS) {
    await sql`
      update ${sql.table(table)}
         set ${sql.join(
           columns.map(
             ([column, ids]) =>
               sql`${sql.ref(column)} = coalesce(${idOf(column, ids)}, ${sql.ref(column)})`,
           ),
         )}
       where ${sql.join(
         columns.map(([column, ids]) => sql`${idOf(column, ids)} is not null`),
         sql` or `,
       )}
    `.execute(db);
  }
  for (const [table, owner] of MANAGED_GROUP_TABLES) {
    for (const [kind, ids] of MANAGED_KINDS) {
      await sql`
        insert into ${sql.table(table)} (${sql.ref(owner)}, kind, code)
        select ${sql.ref(`held.${owner}`)}, held.kind, stored.id
          from ${sql.table(table)} as held
          join ${storedIds(ids)} on stored.code = held.code
         where held.kind = ${kind}
        on conflict do nothing
      `.execute(db);
      await sql`
        delete from ${sql.table(table)}
         using ${storedIds(ids)}
         where ${sql.ref(`${table}.code`)} = stored.code
           and ${sql.ref(`${table}.kind`)} = ${kind}
      `.execute(db);
    }
  }
}

export async function down(): Promise<void> {}
