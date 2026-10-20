import type { OpenAPIHono } from "@hono/zod-openapi";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { TypedResponse } from "hono";

import { createRoute } from "@hono/zod-openapi";
import {
  coreFilterFields,
  toListSamplesQuery,
} from "@projet-igsn/domain/sample/core/core-list-samples-query";
import { z } from "zod";

import type { ServiceEnv } from "../auth/require-service-account.ts";

import {
  FAILED,
  FORBIDDEN_READ,
  OPTIONAL_SECURITY,
  THROTTLED,
} from "./service-route-definitions.ts";

const GEOJSON_MEDIA_TYPE = "application/geo+json";

const featureCollectionSchema = z
  .strictObject({
    type: z.literal("FeatureCollection").meta({
      description: "GeoJSON type of the collection.",
    }),
    features: z
      .array(
        z.strictObject({
          type: z.literal("Feature").meta({
            description: "GeoJSON type of the feature.",
          }),
          geometry: z
            .strictObject({
              type: z.literal("Point").meta({
                description: "GeoJSON type of the geometry.",
              }),
              coordinates: z.tuple([z.number(), z.number()]).meta({
                description:
                  "Longitude then latitude, in decimal degrees rounded to 5 decimals, of a point on the sample's location.",
              }),
            })
            .meta({ description: "Point standing for the sample's location." }),
          properties: z
            .strictObject({
              igsn: z.string().meta({ description: "IGSN of the sample." }),
              name: z.string().meta({ description: "Name of the sample." }),
            })
            .meta({ description: "Identity of the sample." }),
        }),
      )
      .meta({ description: "One feature per matching sample." }),
  })
  .meta({ id: "SampleFeatureCollection" });

type FeatureCollection = z.infer<typeof featureCollectionSchema>;

const mapSamplesRoute = createRoute({
  method: "get",
  path: "/samples/map",
  tags: ["Samples"],
  summary: "Map published samples",
  description: `Answers every published, located sample that is not a sub-sample as a GeoJSON FeatureCollection, for a map embedded on any site. Anyone may call it, from any origin, and any filter of GET /service/samples narrows it.

The api does not group nearby samples: fetch the collection once per filter set and group its points in the browser, so moving the map sends no request. With Leaflet and Leaflet.markercluster, showing the name as text since it may hold markup:

\`\`\`js
const response = await fetch("https://<host>/api/service/samples/map?affiliationLaboratory=<code>");
const samples = L.geoJSON(await response.json(), {
  onEachFeature: (feature, layer) =>
    layer.bindPopup(document.createTextNode(feature.properties.name)),
});
map.addLayer(L.markerClusterGroup().addLayer(samples));
\`\`\``,
  security: OPTIONAL_SECURITY,
  request: { query: z.object(coreFilterFields()) },
  responses: {
    200: {
      description: "The matching samples.",
      content: { [GEOJSON_MEDIA_TYPE]: { schema: featureCollectionSchema } },
    },
    403: FORBIDDEN_READ,
    429: THROTTLED,
    500: FAILED,
  },
});

export function registerMapRoutes(
  app: OpenAPIHono<ServiceEnv>,
  samples: Pick<SampleRepository, "mapPublishedFeaturesJson">,
): void {
  app.openapi(
    mapSamplesRoute,
    async (c) =>
      c.body(
        await samples.mapPublishedFeaturesJson(
          toListSamplesQuery(c.req.valid("query")),
        ),
        200,
        { "Content-Type": GEOJSON_MEDIA_TYPE },
      ) as unknown as TypedResponse<FeatureCollection, 200, "json">,
  );
}
