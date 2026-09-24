type Env = "prod" | "preprod";

type EnvVar = {
  name: string;
  purpose: string;
  scope?: Env;
  required?: true | string;
  secret?: boolean;
  default?: string;
  placeholder?: string | Partial<Record<Env, string>>;
  deployOnly?: boolean;
  fromWorkflow?: boolean;
};

const VARS: EnvVar[] = [
  {
    name: "IMAGE_TAG",
    purpose: "Release tag of the images to run, set by the release workflow.",
    scope: "prod",
    required: true,
    fromWorkflow: true,
  },
  {
    name: "DOMAIN",
    purpose: "Apex domain: the stack is served at https://igsn.$DOMAIN.",
    required: true,
    placeholder: "<domain>",
  },
  {
    name: "DATABASE_HOST",
    purpose: "External managed Postgres host.",
    scope: "prod",
    required: true,
  },
  {
    name: "DATABASE_PORT",
    purpose: "Postgres port.",
    scope: "prod",
    default: "5432",
  },
  {
    name: "DATABASE_NAME",
    purpose: "Database name.",
    required: true,
    default: "igsn",
  },
  {
    name: "DATABASE_USER",
    purpose: "Database user, owner of the schema.",
    required: true,
    default: "igsn",
  },
  {
    name: "DATABASE_PASSWORD",
    purpose: "Database password.",
    required: true,
    secret: true,
  },
  {
    name: "DATABASE_SSL",
    purpose:
      "`verify-full` checks the database certificate, `require` only encrypts; the api refuses any other value.",
    scope: "prod",
    default: "verify-full",
  },
  {
    name: "DATABASE_CA_FILE",
    purpose:
      "CA bundle signing the database certificate, as a path under /ca, when that CA is not a public one.",
    scope: "prod",
  },
  {
    name: "SMTP_HOST",
    purpose: "Outbound mail relay; the api refuses to boot without it.",
    required: true,
  },
  {
    name: "SMTP_PORT",
    purpose: "Relay port; 465 switches to implicit TLS.",
    default: "587",
  },
  { name: "SMTP_USER", purpose: "Relay user; empty means no authentication." },
  {
    name: "SMTP_PASSWORD",
    purpose: "Relay password.",
    required: "SMTP_USER",
    secret: true,
  },
  { name: "SMTP_FROM", purpose: "From address of every mail." },
  { name: "SMTP_FROM_NAME", purpose: "From display name, user-facing mail." },
  {
    name: "SMTP_FROM_NAME_ADMIN",
    purpose: "From display name, admin-audience mail.",
  },
  {
    name: "SAMPLE_SEARCH_FUZZY_THRESHOLD",
    purpose: "pg_trgm similarity threshold of the public search, in (0,1].",
    default: "0.8",
  },
  {
    name: "UPLOAD_LIMIT",
    purpose:
      "Attachments per sample; also baked into the admin bundle as VITE_UPLOAD_LIMIT.",
    default: "5",
  },
  {
    name: "SAMPLE_EDIT_LOCK_TTL_MINUTES",
    purpose: "Lifetime of a sample edit lock.",
    default: "15",
  },
  {
    name: "SAMPLE_LOCK_POLL_SECONDS",
    purpose:
      "Admin lock-poll interval, 30 when unset, baked into the bundle as VITE_SAMPLE_LOCK_POLL_SECONDS.",
    deployOnly: true,
  },
  {
    name: "OIDC_ISSUER",
    purpose:
      "SSO realm; must match the VITE_OIDC_AUTHORITY baked into the images.",
    scope: "prod",
    required: true,
  },
  {
    name: "OIDC_CLIENT_ID",
    purpose:
      "SSO client; must match the VITE_OIDC_CLIENT_ID baked into the images.",
    scope: "prod",
    required: true,
  },
  {
    name: "OIDC_ALLOWED_IDENTITY_PROVIDERS",
    purpose: "Accepted identity-provider aliases, comma separated.",
    default: "satosa,orcid",
  },
  {
    name: "DATACITE_API_HOST",
    purpose:
      "Unset disables DOI registration: samples publish without a DOI; set, publishing answers 502 when DataCite refuses the record.",
    placeholder: {
      prod: "https://api.datacite.org",
      preprod: "https://api.test.datacite.org",
    },
  },
  {
    name: "DATACITE_API_KEY",
    purpose:
      "DataCite credential; the api stops at boot if the host is set without it.",
    required: "DATACITE_API_HOST",
    secret: true,
  },
  {
    name: "DATACITE_DOI_PREFIX",
    purpose:
      "DOI prefix to mint under, 10.70113 on the DataCite test instance.",
    placeholder: "10.70113",
    required: "DATACITE_API_HOST",
  },
  {
    name: "SSH_HOST",
    purpose: "Deploy target, reachable from the GitHub runners.",
    scope: "prod",
    required: true,
    deployOnly: true,
  },
  {
    name: "SSH_PORT",
    purpose: "Deploy target SSH port, 22 when unset.",
    scope: "prod",
    deployOnly: true,
  },
  {
    name: "SSH_USER",
    purpose: "Deploy user, member of the docker group.",
    scope: "prod",
    required: true,
    deployOnly: true,
  },
  {
    name: "SSH_PRIVATE_KEY",
    purpose: "Private key authorized on the deploy target.",
    scope: "prod",
    required: true,
    secret: true,
    deployOnly: true,
  },
  {
    name: "SSH_KNOWN_HOSTS",
    purpose:
      "Host public key of the deploy target, as `ssh-keyscan -p $SSH_PORT $SSH_HOST` prints it.",
    scope: "prod",
    required: true,
    deployOnly: true,
  },
];

const MISSING_EXIT_CODE = 3;

function sources(): Record<string, string | undefined> {
  const json = (raw: string | undefined): Record<string, unknown> =>
    raw ? (JSON.parse(raw) as Record<string, unknown>) : {};

  return {
    ...Object.fromEntries(
      Object.entries({
        ...json(process.env.GITHUB_VARS_JSON),
        ...json(process.env.GITHUB_SECRETS_JSON),
      }).map(([name, value]) => [name, String(value)]),
    ),
    ...process.env,
  };
}

function resolve(vars: EnvVar[]): Map<string, string> {
  const source = sources();
  const values = new Map<string, string>();

  for (const { name, default: fallback } of vars) {
    const value = source[name] || fallback;
    if (value) values.set(name, value);
  }

  return values;
}

function isRequired(variable: EnvVar, values: Map<string, string>): boolean {
  return (
    variable.required === true ||
    (typeof variable.required === "string" && values.has(variable.required))
  );
}

function scoped(env: Env): EnvVar[] {
  return VARS.filter((variable) => !variable.scope || variable.scope === env);
}

function check(env: Env): void {
  const vars = scoped(env);
  const values = resolve(vars);
  const missing = vars.filter(
    (variable) => isRequired(variable, values) && !values.has(variable.name),
  );

  if (missing.length > 0) {
    console.error(
      `missing required ${env} variables: ${missing.map((v) => v.name).join(", ")}`,
    );
    process.exit(MISSING_EXIT_CODE);
  }
}

export function quote(value: string): string {
  const escaped = value.replace(/[\\"$]/g, (char) =>
    char === "$" ? "$$" : `\\${char}`,
  );
  return `"${escaped}"`;
}

function write(env: Env): void {
  const vars = scoped(env).filter((variable) => !variable.deployOnly);
  const values = resolve(vars);

  for (const { name } of vars) {
    const value = values.get(name);
    if (value === undefined) continue;
    if (value.includes("\n"))
      throw new Error(`${name} must not contain a newline`);
    console.info(`${name}=${quote(value)}`);
  }
}

function example(env: Env): void {
  for (const variable of scoped(env).filter((v) => !v.deployOnly)) {
    const placeholder =
      typeof variable.placeholder === "object"
        ? variable.placeholder[env]
        : variable.placeholder;
    console.info(
      `${variable.name}=${variable.secret ? "" : (variable.default ?? placeholder ?? "")}`,
    );
  }
}

function table(env: Env): void {
  console.info("| Name | Required | Source | Purpose |");
  console.info("| ---- | -------- | ------ | ------- |");
  for (const variable of scoped(env)) {
    const required =
      variable.required === true
        ? "yes"
        : typeof variable.required === "string"
          ? `with ${variable.required}`
          : "no";
    const source = variable.fromWorkflow
      ? "release tag"
      : variable.secret
        ? "secret"
        : "variable";
    console.info(
      `| \`${variable.name}\` | ${required} | ${source} | ${variable.purpose} |`,
    );
  }
}

const COMMANDS = { check, write, example, table };

if (import.meta.main) {
  const command = process.argv[2] ?? "";
  const env = process.argv[process.argv.indexOf("--env") + 1];

  if (!(command in COMMANDS) || (env !== "prod" && env !== "preprod")) {
    console.error(
      "usage: compose-env.ts check|write|example|table --env prod|preprod",
    );
    process.exit(1);
  }

  COMMANDS[command as keyof typeof COMMANDS](env);
}
