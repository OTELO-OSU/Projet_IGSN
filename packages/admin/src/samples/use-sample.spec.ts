import { expect, it } from "vitest";

import { parseSampleResponse } from "./use-sample.ts";

const BASALT = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3311",
  name: "Basalt team",
};
const LEFT_BEHIND = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3312",
  name: "Massif Central 2026",
};

const sample = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  name: "Basalte du Massif Central",
  nature: "thin_section",
  type: null,
  material: null,
  texture: null,
  metamorphicFacies: null,
  collectionMethod: null,
  collectionMethodDescription: null,
  specificName: null,
  location: null,
  description: null,
  condition: null,
  security: null,
  availability: "exists",
  publicationYear: null,
  resourceType: null,
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
  igsn: null,
  manualGroups: [LEFT_BEHIND],
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
  status: "draft",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-07-01T10:00:00.000Z",
};

it("should keep offering a group the owner has left while the sample is in it", async () => {
  // Act
  const parsed = await parseSampleResponse(
    Response.json({
      data: sample,
      role: "owner",
      manualGroupOptions: [BASALT],
    }),
  );
  // Assert
  expect(parsed?.manualGroupOptions).toEqual([BASALT, LEFT_BEHIND]);
  expect(parsed?.manualGroupIds).toEqual([LEFT_BEHIND.id]);
});
