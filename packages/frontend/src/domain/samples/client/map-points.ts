import {
  type SampleMapPointsResponse,
  sampleMapPointsResponseSchema,
} from "@projet-igsn/domain/sample/map/model";

import { apiFetch, baseApiUrl } from "#/api.ts";
import {
  type SearchFilters,
  searchFilterParams,
} from "#/domain/samples/client/list-samples.ts";

export type MapPointsParams = Omit<SearchFilters, "viewport">;

export async function mapPoints(
  filters: MapPointsParams,
  fetchFn: typeof fetch = apiFetch,
  onPercent: (percent: number) => void = () => {},
): Promise<SampleMapPointsResponse> {
  const url = new URL("samples/map/points", baseApiUrl);
  url.search = searchFilterParams(filters).toString();

  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error(`Failed to load the map points (${res.status})`);
  }
  const totalBytes = Number(res.headers.get("X-Uncompressed-Length"));
  if (!totalBytes || !res.body) {
    return sampleMapPointsResponseSchema.parse(await res.json());
  }
  const chunks: BlobPart[] = [];
  const reader = res.body.getReader();
  let receivedBytes = 0;
  let percent = 0;
  onPercent(percent);
  for (let read = await reader.read(); !read.done; read = await reader.read()) {
    chunks.push(read.value);
    receivedBytes += read.value.byteLength;
    const receivedPercent = Math.min(
      100,
      Math.floor((receivedBytes * 100) / totalBytes),
    );
    if (receivedPercent !== percent) {
      percent = receivedPercent;
      onPercent(percent);
    }
  }
  return sampleMapPointsResponseSchema.parse(
    await new Response(new Blob(chunks)).json(),
  );
}
