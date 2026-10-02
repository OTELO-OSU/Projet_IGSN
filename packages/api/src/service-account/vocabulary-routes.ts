import type { OpenAPIHono } from "@hono/zod-openapi";

import { createRoute } from "@hono/zod-openapi";
import { coreVocabularies } from "@projet-igsn/domain/sample/core/core-vocabularies";
import { serviceErrorSchema } from "@projet-igsn/domain/service-account/service-sample-validator";
import { languageDetector } from "hono/language";
import { z } from "zod";

import type { ServiceEnv } from "../auth/require-service-account.ts";

import { labels } from "../sample/import-template/labels.ts";
import {
  FAILED,
  FORBIDDEN_READ,
  OPTIONAL_SECURITY,
  THROTTLED,
  json,
} from "./service-route-definitions.ts";

const CATALOGS = { en: coreVocabularies(labels, "en") };

type Language = keyof typeof CATALOGS;

const TAGS = ["Vocabularies"];

const detectLanguage = languageDetector({
  order: ["header"],
  caches: false,
  supportedLanguages: Object.keys(CATALOGS),
  fallbackLanguage: "en",
});

const acceptLanguageHeaderSchema = z.object({
  "accept-language": z.string().optional().meta({
    description:
      "Languages the labels may be served in, by preference. A language with no catalog falls back to English, the only one served today.",
  }),
});

const contentLanguageHeaderSchema = z.object({
  "Content-Language": z.string().meta({
    description: "Language the labels are served in.",
  }),
});

const vocabularyIdParamSchema = z.object({
  id: z.string().meta({
    description:
      "Id of the vocabulary as the index lists it, matched exactly: a Concept scheme, or the IGSN Core field carrying the value.",
  }),
});

const vocabularyListResponseSchema = z
  .strictObject({
    data: z
      .array(
        z.strictObject({
          id: z.string().meta({
            description:
              "Id of the vocabulary: a Concept scheme, or the IGSN Core field carrying the value.",
          }),
          schemeName: z.string().optional().meta({
            description:
              "schemeName a Concept of this vocabulary carries, left out for a field that is not a Concept.",
          }),
        }),
      )
      .meta({ description: "Every vocabulary a record carries." }),
  })
  .meta({ id: "VocabularyList" });

const vocabularyValuesResponseSchema = z
  .strictObject({
    data: z
      .array(
        z.strictObject({
          id: z.union([z.string(), z.number()]).meta({
            description: "Value exactly as a record carries it.",
          }),
          label: z.string().meta({
            description: "Human-readable label of the value.",
          }),
        }),
      )
      .meta({ description: "Every value of the vocabulary." }),
  })
  .meta({ id: "VocabularyValues" });

const translated = <Schema extends z.ZodType>(
  schema: Schema,
  description: string,
) => ({ ...json(schema, description), headers: contentLanguageHeaderSchema });

const listVocabulariesRoute = createRoute({
  method: "get",
  path: "/vocabularies",
  tags: TAGS,
  summary: "List the vocabularies",
  description:
    "Lists every vocabulary whose values an IGSN Core record carries. Anyone may call it.",
  security: OPTIONAL_SECURITY,
  middleware: [detectLanguage] as const,
  request: { headers: acceptLanguageHeaderSchema },
  responses: {
    200: translated(vocabularyListResponseSchema, "Every vocabulary."),
    403: FORBIDDEN_READ,
    429: THROTTLED,
    500: FAILED,
  },
});

const getVocabularyRoute = createRoute({
  method: "get",
  path: "/vocabularies/{id}",
  tags: TAGS,
  summary: "Read one vocabulary",
  description:
    "Returns every value of a vocabulary as a record carries it, each with its label in the language Accept-Language picks. A hierarchy lists every dot path, intermediate levels included. Anyone may call it.",
  security: OPTIONAL_SECURITY,
  middleware: [detectLanguage] as const,
  request: {
    headers: acceptLanguageHeaderSchema,
    params: vocabularyIdParamSchema,
  },
  responses: {
    200: translated(
      vocabularyValuesResponseSchema,
      "Every value of the vocabulary.",
    ),
    403: FORBIDDEN_READ,
    404: json(serviceErrorSchema, "No vocabulary carries this id."),
    429: THROTTLED,
    500: FAILED,
  },
});

const languageHeaders = (language: Language) => ({
  "Content-Language": language,
  Vary: "Accept-Language",
});

export function registerVocabularyRoutes(app: OpenAPIHono<ServiceEnv>) {
  app
    .openapi(listVocabulariesRoute, (c) => {
      const language = c.get("language") as Language;
      return c.json(
        {
          data: CATALOGS[language].map(({ id, schemeName }) => ({
            id,
            schemeName,
          })),
        },
        200,
        languageHeaders(language),
      );
    })
    .openapi(getVocabularyRoute, (c) => {
      const language = c.get("language") as Language;
      const vocabulary = CATALOGS[language].find(
        ({ id }) => id === c.req.valid("param").id,
      );
      if (!vocabulary) {
        return c.json({ error: "Not found" }, 404);
      }
      return c.json(
        { data: vocabulary.values },
        200,
        languageHeaders(language),
      );
    });
}
