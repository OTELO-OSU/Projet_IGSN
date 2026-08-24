import { describe, expect, it } from "vitest";

import { changedSampleFields } from "./changed-sample-fields.ts";

const location = {
  position: { type: "point", longitude: 3, latitude: 45 },
  localityName: "Vosges",
};

const links = [{ url: "https://doi.org/10.1594/IEDA.100252" }];

describe("changedSampleFields", () => {
  it.each([
    { field: "name", current: "Basalt", next: "Granite" },
    {
      field: "location",
      current: location,
      next: { ...location, localityName: "Alpes" },
    },
    {
      field: "links",
      current: links,
      next: [{ url: "https://doi.org/10.1594/IEDA.100253" }],
    },
  ])("should report $field when its value differs", ({ field, ...values }) => {
    // Arrange / Act
    const result = changedSampleFields(
      { [field]: values.current },
      { [field]: values.next },
    );
    // Assert
    expect(result).toEqual([field]);
  });

  it.each([
    { field: "name", value: "Basalt" },
    { field: "location", value: location },
    { field: "links", value: links },
  ])("should not report $field when its value is equal", ({ field, value }) => {
    // Arrange / Act
    const result = changedSampleFields(
      { [field]: value },
      { [field]: structuredClone(value) },
    );
    // Assert
    expect(result).toEqual([]);
  });

  it.each([
    {
      case: "null vs undefined",
      current: { age: null },
      next: { age: undefined },
    },
    { case: "empty array vs absent", current: { links: [] }, next: {} },
  ])("should not report a field with no value ($case)", ({ current, next }) => {
    // Arrange / Act
    const result = changedSampleFields(current, next);
    // Assert
    expect(result).toEqual([]);
  });

  it("should not report links when only the stored id is absent from the payload", () => {
    // Arrange
    const current = {
      links: [
        {
          id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
          url: "https://doi.org/10.1594/IEDA.100252",
          description: null,
        },
      ],
    };
    const next = { links: [{ url: "https://doi.org/10.1594/IEDA.100252" }] };
    // Act
    const result = changedSampleFields(current, next);
    // Assert
    expect(result).toEqual([]);
  });

  it("should not report an excluded field that differs", () => {
    // Arrange
    const current = {
      name: "Basalt",
      attachments: [{ id: "a" }],
      manualGroupIds: ["g1"],
    };
    const next = { name: "Basalt", attachments: [], manualGroupIds: ["g2"] };
    // Act
    const result = changedSampleFields(current, next);
    // Assert
    expect(result).toEqual([]);
  });

  it("should report the changed fields in SAMPLE_MAIL_FIELDS order", () => {
    // Arrange / Act
    const result = changedSampleFields(
      { description: null, name: "Basalt" },
      { description: { collectionDate: null }, name: "Granite" },
    );
    // Assert
    expect(result).toEqual(["name", "description"]);
  });
});
