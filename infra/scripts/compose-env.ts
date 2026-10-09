import { readFileSync } from "node:fs";

type Env = "preproduction" | "production";

type EnvVar = {
  name: string;
  purpose: string;
  required?: true | string;
  secret?: boolean;
  default?: string;
  placeholder?: string | Partial<Record<Env, string>>;
  deployOnly?: boolean;
  fromPipeline?: boolean;
};

type Source = Record<string, string | undefined>;

type Pair = { name: string; value: string };

const VARS: EnvVar[] = [
  {
    name: "IMAGE_PREFIX",
    purpose: "Registry path of the images, set by the workflow.",
    required: true,
    placeholder: "registry.osupytheas.fr/insu/projet_igsn",
    fromPipeline: true,
  },
  {
    name: "IMAGE_TAG",
    purpose: "Tag of the images to run.",
    required: true,
    placeholder: { preproduction: "preprod-<short sha>", production: "v1.2.3" },
    fromPipeline: true,
  },
  {
    name: "DOMAIN",
    purpose: "Apex domain: the stack is served at https://igsn.$DOMAIN.",
    required: true,
    placeholder: "<domain>",
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
    name: "DATABASE_POOL_MAX",
    purpose:
      "Most connections the api opens to Postgres; set it to about the database's CPU count, unset keeps postgres.js's 10.",
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
    purpose: "pg_trgm similarity threshold of the person facets, in (0,1].",
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
    name: "EMBARGO_RELEASE_CRON",
    purpose:
      "Cron pattern (Europe/Paris) of the embargo release job; every minute on the dev stack.",
    default: "0 6 * * *",
  },
  {
    name: "SAMPLE_LOCK_POLL_SECONDS",
    purpose:
      "Admin lock-poll interval, 30 when unset, baked into the bundle as VITE_SAMPLE_LOCK_POLL_SECONDS.",
    deployOnly: true,
  },
  {
    name: "OIDC_ISSUER",
    purpose: "SSO realm, also baked into the bundles as VITE_OIDC_AUTHORITY.",
    required: true,
    placeholder: {
      preproduction: "https://sso-test.earth-data.fr/realms/gaia-data",
    },
  },
  {
    name: "OIDC_CLIENT_ID",
    purpose: "SSO client, also baked into the bundles as VITE_OIDC_CLIENT_ID.",
    required: true,
    placeholder: { preproduction: "formaterre-igsn" },
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
      preproduction: "https://api.test.datacite.org",
      production: "https://api.datacite.org",
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
    name: "PORTAINER_URL",
    purpose: "Base URL of the Portainer the stack is deployed on.",
    required: true,
    placeholder: "https://portainer.example.org",
    deployOnly: true,
  },
  {
    name: "PORTAINER_API_KEY",
    purpose: "Portainer access token of the deploy user.",
    required: true,
    secret: true,
    deployOnly: true,
  },
  {
    name: "PORTAINER_STACK_ID",
    purpose: "Id of this environment's Portainer stack.",
    required: true,
    placeholder: "12",
    deployOnly: true,
  },
  {
    name: "PORTAINER_ENDPOINT_ID",
    purpose: "Id of the Portainer environment running the stack.",
    required: true,
    placeholder: "1",
    deployOnly: true,
  },
  {
    name: "REGISTRY_USER",
    purpose:
      "Bot username of the `insu/Projet_IGSN` GitLab project access token, at repository level.",
    required: true,
    deployOnly: true,
  },
  {
    name: "REGISTRY_PASSWORD",
    purpose:
      "That token (Maintainer, `api` and `write_registry`), at repository level: it pushes the images and deletes a deleted tag's.",
    required: true,
    secret: true,
    deployOnly: true,
  },
  {
    name: "VPN_HOST",
    purpose:
      "Fortinet VPN gateway host the deploy reaches the registry and Portainer through.",
    required: true,
    deployOnly: true,
  },
  {
    name: "VPN_PORT",
    purpose: "Fortinet VPN gateway port, openfortivpn's 443 when unset.",
    deployOnly: true,
  },
  {
    name: "VPN_USER",
    purpose: "Fortinet VPN account, one without OTP.",
    required: true,
    deployOnly: true,
  },
  {
    name: "VPN_PASSWORD",
    purpose: "Fortinet VPN account password.",
    required: true,
    secret: true,
    deployOnly: true,
  },
  {
    name: "VPN_TRUSTED_CERT",
    purpose:
      "SHA-256 digest of the gateway certificate, needed when it is not publicly trusted.",
    deployOnly: true,
  },
];

const MISSING_EXIT_CODE = 3;

const STACK_FILE = new URL("../stack/docker-compose.yml", import.meta.url);

function resolve(source: Source): Map<string, string> {
  const values = new Map<string, string>();

  for (const { name, default: fallback } of VARS) {
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

export function stackEnv(source: Source): Pair[] {
  const values = resolve(source);

  return VARS.filter((variable) => !variable.deployOnly).flatMap(({ name }) => {
    const value = values.get(name);
    if (value === undefined) return [];
    if (value.includes("\n"))
      throw new Error(`${name} must not contain a newline`);
    return [{ name, value }];
  });
}

function check(): void {
  const values = resolve(process.env);
  const missing = VARS.filter(
    (variable) => isRequired(variable, values) && !values.has(variable.name),
  );

  if (missing.length > 0) {
    console.error(
      `missing required variables: ${missing.map((v) => v.name).join(", ")}`,
    );
    process.exit(MISSING_EXIT_CODE);
  }
}

function payload(): void {
  console.info(
    JSON.stringify({
      stackFileContent: readFileSync(STACK_FILE, "utf8"),
      env: stackEnv(process.env),
      prune: true,
      pullImage: true,
    }),
  );
}

function example(variable: EnvVar): string {
  const { default: fallback, placeholder } = variable;
  if (fallback) return `\`${fallback}\``;
  if (typeof placeholder === "string") return `\`${placeholder}\``;
  return Object.entries(placeholder ?? {})
    .map(([env, value]) => `${env}: \`${value}\``)
    .join("<br>");
}

function table(): void {
  console.info(`# Deploy variables

- Generated by \`make env-docs\` from \`infra/scripts/compose-env.ts\`, never edit by hand.
- Define each on GitHub as [deploy.md](deploy.md#defining-the-variables-in-github) explains.

| Name | Required | Kind | Example | Purpose |
| ---- | -------- | ---- | ------- | ------- |`);
  for (const variable of VARS) {
    const required =
      variable.required === true
        ? "yes"
        : typeof variable.required === "string"
          ? `with \`${variable.required}\``
          : "no";
    const kind = variable.fromPipeline
      ? "pipeline"
      : variable.secret
        ? "secret"
        : "variable";
    console.info(
      `| \`${variable.name}\` | ${required} | ${kind} | ${example(variable)} | ${variable.purpose} |`,
    );
  }
}

const COMMANDS = { check, payload, table };

if (import.meta.main) {
  const command = process.argv[2] ?? "";

  if (!(command in COMMANDS)) {
    console.error("usage: compose-env.ts check|payload|table");
    process.exit(1);
  }

  COMMANDS[command as keyof typeof COMMANDS]();
}
