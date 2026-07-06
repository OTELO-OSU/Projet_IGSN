import { taxonomyPaths } from "./taxonomy-paths";

describe("taxonomyPaths", () => {
  it("should list every node path, ancestors included, depth first", () => {
    // Arrange
    const tree = {
      rock: { igneous: { volcanic: {}, plutonic: {} }, sedimentary: {} },
      soil: {},
    };
    // Act
    const paths = taxonomyPaths(tree);
    // Assert
    expect(paths).toEqual([
      "rock",
      "rock.igneous",
      "rock.igneous.volcanic",
      "rock.igneous.plutonic",
      "rock.sedimentary",
      "soil",
    ]);
  });

  it("should return no path for an empty tree", () => {
    // Act / Assert
    expect(taxonomyPaths({})).toEqual([]);
  });
});
