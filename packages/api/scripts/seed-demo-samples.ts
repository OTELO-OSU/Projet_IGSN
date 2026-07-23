import type { Location } from "@projet-igsn/domain/sample/location/model";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";

import type { SeedSample } from "./seed.ts";

// Demo dataset for the public frontend / admin walkthrough: 100 geologically
// coherent samples covering every branch of the sample vocabularies, with a
// location wherever the domain allows one. Authored without id/igsn/published;
// those are injected by position in the map below (see seed-demo.ts). English
// only (i18n testing rule). Kept separate from SEED_SAMPLES, which the E2E
// suite asserts on.
type DemoRow = Omit<SeedSample, "id" | "igsn" | "published">;

type Position = NonNullable<Location["position"]>;
type Elevation = NonNullable<Position["elevation"]>;

const point = (
  longitude: number,
  latitude: number,
  elevation?: Elevation,
): Position => ({ type: "point", longitude, latitude, elevation });

const area = (
  westLongitude: number,
  eastLongitude: number,
  southLatitude: number,
  northLatitude: number,
  elevation?: Elevation,
): Position => ({
  type: "area",
  westLongitude,
  eastLongitude,
  southLatitude,
  northLatitude,
  elevation,
});

// Whole signed units: positive above the datum, negative below (bathymetry).
const elev = (
  min: number,
  max: number,
  unit: Elevation["unit"],
  datum: Elevation["datum"],
): Elevation => ({ min, max, unit, datum });

// Collection period; a single day is the degenerate range start === end.
const on = (start: string, end: string = start) => ({
  collectionDate: { start, end },
});

// 70 complete, publishable rows. Each carries a leaf type, a leaf material,
// texture/facies where the material calls for it, a location (unless the
// material forbids/exempts it), a collection date and availability.
const PUBLISHED: DemoRow[] = [
  // Igneous, plutonic (texture from the plutonic set).
  {
    name: "Brittany Granite",
    nature: "thin_section",
    type: "core.piece",
    material: "rock.igneous.plutonic.felsic.granite",
    texture: "phaneritic",
    collectionMethod: "blasting",
    location: {
      position: point(-3.5, 48.2),
      region: { kind: "continent", country: "FR" },
      localityName: "Ploumanac'h quarry",
    },
    description: on("2025-05-12"),
    availability: "exists",
  },
  {
    name: "Corsica Granodiorite",
    nature: "rock_chips",
    type: "core.slab",
    material: "rock.igneous.plutonic.felsic.granodiorite",
    texture: "porphyritic",
    collectionMethod: "manual",
    location: {
      position: point(9.1, 42.15, elev(800, 800, "m", "msl")),
      region: { kind: "continent", country: "FR" },
    },
    description: on("2025-06-20"),
    availability: "exists",
  },
  {
    name: "Aar Massif Tonalite",
    nature: "hand_sample",
    type: "individual_sample",
    material: "rock.igneous.plutonic.felsic.tonalite",
    texture: "phaneritic",
    collectionMethod: "manual",
    location: {
      position: point(8.3, 46.7, elev(2200, 2200, "m", "msl")),
      region: { kind: "continent", country: "CH" },
    },
    description: on("2024-08-01"),
    availability: "exists",
  },
  {
    name: "Bushveld Gabbro",
    nature: "polished_section",
    type: "core.piece",
    material: "rock.igneous.plutonic.mafic.gabbro",
    texture: "cumulate",
    collectionMethod: "blasting",
    location: {
      position: point(29.5, -25.0),
      region: { kind: "continent", country: "ZA" },
    },
    description: on("2025-02-14"),
    availability: "exists",
  },
  {
    name: "Harz Norite",
    nature: "hand_sample",
    type: "individual_sample",
    material: "rock.igneous.plutonic.mafic.norite",
    texture: "poikilitic",
    collectionMethod: "manual",
    location: {
      position: point(10.7, 51.9),
      region: { kind: "continent", country: "DE" },
    },
    description: on("2024-09-03"),
    availability: "exists",
  },
  {
    name: "Oman Ophiolite Peridotite",
    nature: "hand_sample",
    type: "individual_sample",
    material: "rock.igneous.plutonic.ultramafic.peridotite",
    texture: "phaneritic",
    collectionMethod: "manual",
    specificName: "OM-OPH-2025-11",
    location: {
      position: point(58.1, 23.1, elev(450, 450, "m", "msl")),
      region: { kind: "continent", country: "OM" },
    },
    description: on("2025-03-30"),
    availability: "exists",
  },
  {
    name: "Oslo Rift Syenite",
    nature: "thin_section",
    type: "core.section",
    material: "rock.igneous.plutonic.intermediate.syenite",
    texture: "porphyritic",
    collectionMethod: "blasting",
    location: {
      position: point(10.7, 59.9),
      region: { kind: "continent", country: "NO" },
    },
    description: on("2024-07-19"),
    availability: "exists",
  },
  // Igneous, volcanic (texture from the volcanic set).
  {
    name: "Massif Central Basalt",
    nature: "hand_sample",
    type: "core.half_round",
    material: "rock.igneous.volcanic.mafic.basalt",
    texture: "vesicular",
    collectionMethod: "manual",
    location: {
      position: point(2.96, 45.77, elev(1050, 1050, "m", "msl")),
      region: { kind: "continent", country: "FR" },
    },
    description: on("2025-06-15"),
    availability: "exists",
  },
  {
    name: "Reykjanes Ridge Basalt",
    nature: "rock_chips",
    type: "dredge",
    material: "rock.igneous.volcanic.mafic.basalt",
    texture: "aphanitic",
    collectionMethod: "dredging.chain_bag",
    specificName: "AT-2025-RR03",
    collectionMethodDescription: "Chain-bag dredge on the axial ridge flank",
    location: {
      position: area(-30.5, -29.8, 56.8, 57.2, elev(-1520, -1520, "m", "msl")),
      region: { kind: "ocean", oceanSea: "atlantic_ocean" },
      navigationType: "GPS",
    },
    description: on("2025-04-08"),
    availability: "exists",
  },
  {
    name: "Etna Trachyte",
    nature: "thin_section",
    type: "individual_sample",
    material: "rock.igneous.volcanic.intermediate.trachyte",
    texture: "porphyritic",
    collectionMethod: "manual",
    location: {
      position: point(15.0, 37.75, elev(2900, 2900, "m", "msl")),
      region: { kind: "continent", country: "IT" },
    },
    description: on("2025-05-01"),
    availability: "exists",
  },
  {
    name: "Yellowstone Rhyolite",
    nature: "rock_chips",
    type: "individual_sample",
    material: "rock.igneous.volcanic.felsic.rhyolite",
    texture: "glassy",
    collectionMethod: "manual",
    location: {
      position: point(-110.6, 44.6, elev(2400, 2400, "m", "wgs84")),
      region: { kind: "continent", country: "US" },
    },
    description: on("2024-06-11"),
    availability: "exists",
  },
  {
    name: "Andean Andesite",
    nature: "thin_section",
    type: "individual_sample",
    material: "rock.igneous.volcanic.intermediate.andesite",
    texture: "microlitic",
    collectionMethod: "manual",
    location: {
      position: point(-70.0, -23.0, elev(3800, 3800, "m", "msl")),
      region: { kind: "continent", country: "CL" },
    },
    description: on("2025-01-22"),
    availability: "exists",
  },
  {
    name: "Barberton Komatiite",
    nature: "polished_section",
    type: "individual_sample",
    material: "rock.igneous.volcanic.ultramafic.komatiite",
    texture: "aphanitic",
    collectionMethod: "manual",
    location: {
      position: point(31.0, -25.8),
      region: { kind: "continent", country: "ZA" },
    },
    description: on("2024-10-05"),
    availability: "exists",
  },
  {
    name: "Canary Phonolite",
    nature: "hand_sample",
    type: "individual_sample",
    material: "rock.igneous.volcanic.intermediate.phonolite",
    texture: "porphyritic",
    collectionMethod: "manual",
    location: {
      position: point(-16.6, 28.3, elev(1900, 1900, "m", "msl")),
      region: { kind: "continent", country: "ES" },
    },
    description: on("2025-02-02"),
    availability: "exists",
  },
  {
    name: "Deccan Picrite",
    nature: "rock_chips",
    type: "individual_sample",
    material: "rock.igneous.volcanic.ultramafic.picrite",
    texture: "aphanitic",
    collectionMethod: "manual",
    location: {
      position: point(73.8, 18.5),
      region: { kind: "continent", country: "IN" },
    },
    description: on("2024-11-20"),
    availability: "exists",
  },
  {
    name: "Kimberley Kimberlite",
    nature: "hand_sample",
    type: "individual_sample",
    material: "rock.igneous.volcanic.exotic.kimberlite",
    texture: "porphyritic",
    collectionMethod: "manual",
    location: {
      position: point(24.77, -28.74),
      region: { kind: "continent", country: "ZA" },
    },
    description: on("2025-03-11"),
    availability: "exists",
  },
  // Metamorphic (facies required; two also carry a texture via meta_igneous).
  {
    name: "Carrara Marble",
    nature: "hand_sample",
    type: "individual_sample",
    material: "rock.metamorphic.strongly_metamorphosed.marble",
    metamorphicFacies: "greenschist",
    collectionMethod: "blasting",
    location: {
      position: point(10.1, 44.08),
      region: { kind: "continent", country: "IT" },
      localityName: "Carrara quarry",
    },
    description: on("2024-05-30"),
    availability: "exists",
  },
  {
    name: "Alpine Mica Schist",
    nature: "thin_section",
    type: "core.piece",
    material: "rock.metamorphic.strongly_metamorphosed.mica_schist",
    metamorphicFacies: "greenschist",
    collectionMethod: "manual",
    location: {
      position: point(7.0, 45.9),
      region: { kind: "continent", country: "IT" },
    },
    description: on("2025-01-15"),
    availability: "exists",
  },
  {
    name: "Lofoten Gneiss",
    nature: "polished_section",
    type: "individual_sample",
    material: "rock.metamorphic.strongly_metamorphosed.gneiss",
    metamorphicFacies: "amphibolite",
    collectionMethod: "manual",
    location: {
      position: point(13.6, 68.2),
      region: { kind: "continent", country: "NO" },
    },
    description: on("2024-08-22"),
    availability: "exists",
  },
  {
    name: "Western Gneiss Eclogite",
    nature: "thin_section",
    type: "core.piece",
    material: "rock.metamorphic.strongly_metamorphosed.eclogite",
    metamorphicFacies: "eclogite",
    collectionMethod: "manual",
    location: {
      position: point(6.5, 61.9),
      region: { kind: "continent", country: "NO" },
    },
    description: on("2025-02-27"),
    availability: "exists",
  },
  {
    name: "Franciscan Blueschist",
    nature: "hand_sample",
    type: "individual_sample",
    material: "rock.metamorphic.strongly_metamorphosed.glaucophanite",
    metamorphicFacies: "blueschist",
    collectionMethod: "manual",
    location: {
      position: point(-122.5, 37.8),
      region: { kind: "continent", country: "US" },
    },
    description: on("2024-09-14"),
    availability: "exists",
  },
  {
    name: "Highland Quartzite",
    nature: "rock_chips",
    type: "individual_sample",
    material: "rock.metamorphic.strongly_metamorphosed.quartzite",
    metamorphicFacies: "amphibolite",
    collectionMethod: "manual",
    location: {
      position: point(-5.0, 58.2),
      region: { kind: "continent", country: "GB" },
    },
    description: on("2025-04-19"),
    availability: "exists",
  },
  {
    name: "Welsh Slate Series",
    nature: "thick_section",
    type: "serie_of_sample",
    material: "rock.metamorphic.strongly_metamorphosed.slate",
    metamorphicFacies: "greenschist",
    collectionMethod: "blasting",
    location: {
      position: point(-4.0, 53.0),
      region: { kind: "continent", country: "GB" },
    },
    description: on("2024-07-07"),
    availability: "exists",
  },
  {
    name: "Lapland Granulite",
    nature: "thin_section",
    type: "individual_sample",
    material: "rock.metamorphic.strongly_metamorphosed.granulite",
    metamorphicFacies: "granulite",
    collectionMethod: "manual",
    location: {
      position: point(26.0, 68.5),
      region: { kind: "continent", country: "FI" },
    },
    description: on("2025-03-05"),
    availability: "exists",
  },
  {
    name: "Ivrea Amphibolite",
    nature: "polished_section",
    type: "core.section",
    material: "rock.metamorphic.strongly_metamorphosed.amphibolite",
    metamorphicFacies: "amphibolite",
    collectionMethod: "manual",
    location: {
      position: point(8.0, 45.7),
      region: { kind: "continent", country: "IT" },
    },
    description: on("2024-10-30"),
    availability: "exists",
  },
  {
    name: "Zermatt Metabasalt",
    nature: "thin_section",
    type: "individual_sample",
    material:
      "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.volcanic.mafic.basalt",
    texture: "aphanitic",
    metamorphicFacies: "greenschist",
    collectionMethod: "manual",
    location: {
      position: point(7.1, 45.5, elev(2500, 2500, "m", "msl")),
      region: { kind: "continent", country: "IT" },
    },
    description: on("2025-01-08"),
    availability: "exists",
  },
  {
    name: "Aosta Metagranite",
    nature: "thin_section",
    type: "individual_sample",
    material:
      "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic.felsic.granite",
    texture: "phaneritic",
    metamorphicFacies: "greenschist",
    collectionMethod: "manual",
    location: {
      position: point(6.9, 45.2),
      region: { kind: "continent", country: "IT" },
    },
    description: on("2025-02-18"),
    availability: "exists",
  },
  // Sedimentary rock.
  {
    name: "Fontainebleau Sandstone",
    nature: "rock_powder",
    type: "individual_sample",
    material: "rock.sedimentary.clastic_sedimentary_rock.sandstone",
    collectionMethod: "manual",
    location: {
      position: point(2.7, 48.4),
      region: { kind: "continent", country: "FR" },
    },
    description: on("2024-06-01"),
    availability: "exists",
  },
  {
    name: "Jura Limestone",
    nature: "rock_chips",
    type: "individual_sample",
    material:
      "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.carbonate_rock.limestone",
    collectionMethod: "manual",
    location: {
      position: point(5.9, 46.7),
      region: { kind: "continent", country: "FR" },
    },
    description: on("2025-05-25"),
    availability: "exists",
  },
  {
    name: "Dolomites Dolostone",
    nature: "hand_sample",
    type: "individual_sample",
    material:
      "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.carbonate_rock.dolostone",
    collectionMethod: "manual",
    location: {
      position: point(11.9, 46.4, elev(2100, 2100, "m", "msl")),
      region: { kind: "continent", country: "IT" },
    },
    description: on("2024-08-18"),
    availability: "exists",
  },
  {
    name: "Franconian Chert",
    nature: "rock_chips",
    type: "individual_sample",
    material:
      "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.siliceous_rock.chert",
    collectionMethod: "manual",
    location: {
      position: point(11.0, 49.8),
      region: { kind: "continent", country: "DE" },
    },
    description: on("2025-01-30"),
    availability: "exists",
  },
  {
    name: "Paris Basin Gypsum",
    nature: "hand_sample",
    type: "individual_sample",
    material:
      "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.evaporite.gypsum_stone",
    collectionMethod: "manual",
    location: {
      position: point(2.35, 48.9),
      region: { kind: "continent", country: "FR" },
    },
    description: on("2024-09-27"),
    availability: "exists",
  },
  {
    name: "Ruhr Coal Core",
    nature: "sample_fragment",
    type: "core.whole_round",
    material:
      "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.organic_rich_rock.coal",
    collectionMethod: "coring.drill_corer",
    specificName: "RUHR-BH-14",
    location: {
      position: point(7.2, 51.5, elev(-800, -800, "m", "msl")),
      region: { kind: "continent", country: "DE" },
    },
    description: on("2024-11-11"),
    availability: "exists",
  },
  {
    name: "North Sea Mudstone Core",
    nature: "sample_fragment",
    type: "core.section",
    material: "rock.sedimentary.clastic_sedimentary_rock.mudstone",
    collectionMethod: "coring.drill_corer",
    specificName: "NS-42/10-A",
    location: {
      position: point(2.0, 57.0, elev(-2500, -2500, "m", "msl")),
      region: { kind: "ocean", oceanSea: "north_sea" },
      navigationType: "GPS",
    },
    description: on("2025-02-09"),
    availability: "exists",
  },
  // Hydrothermal rock (seafloor vents).
  {
    name: "TAG Sulfide Chimney",
    nature: "hand_sample",
    type: "individual_sample",
    material: "rock.hydrothermal.sulfide",
    collectionMethod: "grab.rov",
    collectionMethodDescription: "ROV manipulator grab of an active chimney",
    location: {
      position: point(-44.83, 26.14, elev(-3620, -3620, "m", "msl")),
      region: { kind: "ocean", oceanSea: "atlantic_ocean" },
      navigationType: "USBL",
    },
    description: on("2025-03-22"),
    availability: "exists",
  },
  {
    name: "Rainbow Hydrothermal Breccia",
    nature: "rock_chips",
    type: "individual_sample",
    material: "rock.hydrothermal.breccia",
    collectionMethod: "grab.hov",
    location: {
      position: point(-33.9, 36.23, elev(-2300, -2300, "m", "msl")),
      region: { kind: "ocean", oceanSea: "atlantic_ocean" },
      navigationType: "DVL/LBL",
    },
    description: on("2024-10-16"),
    availability: "exists",
  },
  {
    name: "Lost City Carbonate",
    nature: "hand_sample",
    type: "individual_sample",
    material: "rock.hydrothermal.carbonate",
    collectionMethod: "grab.rov",
    location: {
      position: point(-30.13, 30.13, elev(-750, -750, "m", "msl")),
      region: { kind: "ocean", oceanSea: "atlantic_ocean" },
      navigationType: "USBL",
    },
    description: on("2025-04-27"),
    availability: "exists",
  },
  // Sediment (root).
  {
    name: "Pacific Abyssal Clay",
    nature: "separated_materials",
    type: "core.section",
    material: "sediment.exogenous_detritic.clay",
    collectionMethod: "coring.gravity_corer.giant",
    specificName: "PAC-GC-07",
    collectionMethodDescription: "Giant gravity corer, 8 m recovery",
    location: {
      position: point(-140.0, 30.0, elev(-5000, -5000, "m", "msl")),
      region: { kind: "ocean", oceanSea: "pacific_ocean" },
      navigationType: "GPS",
    },
    description: on("2024-07-30"),
    availability: "exists",
  },
  {
    name: "Loire Sand",
    nature: "rock_powder",
    type: "individual_sample",
    material: "sediment.exogenous_detritic.sand.medium_sand",
    collectionMethod: "manual",
    location: {
      position: point(-1.5, 47.2),
      region: { kind: "continent", country: "FR" },
    },
    description: on("2025-05-06"),
    availability: "exists",
  },
  {
    name: "Rhine Gravel",
    nature: "multiple_sample",
    type: "individual_sample",
    material: "sediment.exogenous_detritic.gravel.pebble",
    collectionMethod: "manual",
    location: {
      position: point(7.6, 47.6),
      region: { kind: "continent", country: "DE" },
    },
    description: on("2024-06-25"),
    availability: "exists",
  },
  {
    name: "Champagne Loess Silt",
    nature: "rock_powder",
    type: "individual_sample",
    material: "sediment.exogenous_detritic.silt.medium_silt",
    collectionMethod: "manual",
    location: {
      position: point(4.9, 48.3),
      region: { kind: "continent", country: "FR" },
    },
    description: on("2025-01-19"),
    availability: "exists",
  },
  {
    name: "Vesuvius Volcanic Ash",
    nature: "rock_powder",
    type: "individual_sample",
    material: "sediment.volcano_detritic.ash.glass",
    collectionMethod: "manual",
    location: {
      position: point(14.43, 40.82),
      region: { kind: "continent", country: "IT" },
    },
    description: on("2024-09-09"),
    availability: "exists",
  },
  {
    name: "Bahamas Carbonate Ooze",
    nature: "sample_fragment",
    type: "core.section",
    material: "sediment.biogenic.carbonate.mud_supported.mudstone",
    collectionMethod: "coring.piston_corer.giant",
    location: {
      position: point(-76.0, 24.0, elev(-600, -600, "m", "msl")),
      region: { kind: "ocean", oceanSea: "atlantic_ocean" },
      navigationType: "GPS",
    },
    description: on("2025-02-21"),
    availability: "exists",
  },
  {
    name: "Southern Ocean Diatom Ooze",
    nature: "separated_materials",
    type: "core.section",
    material: "sediment.biogenic.siliceous.diatoms",
    collectionMethod: "coring.gravity_corer.giant",
    location: {
      position: point(170.0, -60.0, elev(-3500, -3500, "m", "msl")),
      region: { kind: "ocean", oceanSea: "pacific_ocean" },
      navigationType: "GPS",
    },
    description: on("2024-12-03"),
    availability: "exists",
  },
  {
    name: "Irish Bog Peat",
    nature: "sample_fragment",
    type: "individual_sample",
    material: "sediment.biogenic.organic_rich.peat",
    collectionMethod: "probe",
    location: {
      position: point(-8.0, 53.4),
      region: { kind: "continent", country: "IE" },
    },
    description: on("2025-03-17"),
    availability: "exists",
  },
  {
    name: "Red Sea Evaporitic Precipitate",
    nature: "rock_powder",
    type: "individual_sample",
    material: "sediment.physico_chemical.precipitates.evaporitic",
    collectionMethod: "grab.grab",
    location: {
      position: point(38.5, 21.0, elev(-1800, -1800, "m", "msl")),
      region: { kind: "ocean", oceanSea: "red_sea" },
      navigationType: "GPS",
    },
    description: on("2024-08-12"),
    availability: "exists",
  },
  // Mineral (leaf root).
  {
    name: "Alpine Quartz Crystal",
    nature: "hand_sample",
    type: "individual_sample",
    material: "mineral",
    collectionMethod: "manual",
    location: {
      position: point(8.5, 46.5, elev(2600, 2600, "m", "msl")),
      region: { kind: "continent", country: "CH" },
    },
    description: on("2024-07-01"),
    availability: "exists",
  },
  {
    name: "Rio Tinto Pyrite",
    nature: "polished_section",
    type: "individual_sample",
    material: "mineral",
    collectionMethod: "manual",
    location: {
      position: point(-6.6, 37.7),
      region: { kind: "continent", country: "ES" },
    },
    description: on("2025-04-14"),
    availability: "exists",
  },
  {
    name: "Minas Gerais Beryl",
    nature: "hand_sample",
    type: "individual_sample",
    material: "mineral",
    collectionMethod: "manual",
    location: {
      position: point(-43.0, -18.0),
      region: { kind: "continent", country: "BR" },
    },
    description: on("2024-10-22"),
    availability: "exists",
  },
  // Fossil (leaf root).
  {
    name: "Normandy Ammonite",
    nature: "hand_sample",
    type: "individual_sample",
    material: "fossil",
    collectionMethod: "manual",
    location: {
      position: point(0.2, 49.3),
      region: { kind: "continent", country: "FR" },
    },
    description: on("2025-05-18"),
    availability: "exists",
  },
  {
    name: "Bohemian Trilobite",
    nature: "hand_sample",
    type: "individual_sample",
    material: "fossil",
    collectionMethod: "manual",
    location: {
      position: point(14.0, 50.0),
      region: { kind: "continent", country: "CZ" },
    },
    description: on("2024-09-19"),
    availability: "exists",
  },
  {
    name: "Dorset Belemnite",
    nature: "hand_sample",
    type: "individual_sample",
    material: "fossil",
    collectionMethod: "manual",
    location: {
      position: point(-2.5, 50.7),
      region: { kind: "continent", country: "GB" },
    },
    description: on("2025-01-27"),
    availability: "exists",
  },
  // Synthetic (leaf root): location forbidden (ADR 0014).
  {
    name: "Synthetic Corundum",
    nature: "inapplicable",
    type: "inapplicable",
    material: "synthetic_rock_mineral",
    collectionMethod: "experimental_apparatus",
    description: on("2025-06-01"),
    availability: "exists",
  },
  {
    name: "Synthetic Forsterite",
    nature: "thin_section",
    type: "inapplicable",
    material: "synthetic_rock_mineral",
    collectionMethod: "experimental_apparatus",
    description: on("2024-11-30"),
    availability: "exists",
  },
  // Extraterrestrial meteorites (found on Earth: location required).
  {
    name: "Sahara Ordinary Chondrite",
    nature: "hand_sample",
    type: "individual_sample",
    material:
      "extraterrestrial_rock.meteorites.chondrites.ordinary_chondrites.h",
    collectionMethod: "manual",
    location: {
      position: point(1.0, 27.5),
      region: { kind: "continent", country: "DZ" },
    },
    description: on("2024-06-05"),
    availability: "exists",
  },
  {
    name: "Victoria CM Chondrite",
    nature: "thin_section",
    type: "individual_sample",
    material:
      "extraterrestrial_rock.meteorites.chondrites.carbonaceous_chondrites.cm",
    collectionMethod: "manual",
    location: {
      position: point(145.2, -36.6),
      region: { kind: "continent", country: "AU" },
    },
    description: on("2025-02-11"),
    availability: "exists",
  },
  {
    name: "Canyon Diablo Iron Meteorite",
    nature: "polished_section",
    type: "individual_sample",
    material:
      "extraterrestrial_rock.meteorites.achondrites.iron_meteorite.iiab",
    collectionMethod: "manual",
    location: {
      position: point(-111.02, 35.03),
      region: { kind: "continent", country: "US" },
    },
    description: on("2024-08-08"),
    availability: "exists",
  },
  {
    name: "NWA Shergottite",
    nature: "thin_section",
    type: "individual_sample",
    material:
      "extraterrestrial_rock.meteorites.achondrites.stony_achondrite.martian_meteorite.shergottite",
    collectionMethod: "manual",
    specificName: "NWA-8686",
    location: {
      position: point(-5.0, 28.0),
      region: { kind: "continent", country: "MA" },
    },
    description: on("2025-03-01"),
    availability: "exists",
  },
  {
    name: "Antarctic Lunar Meteorite",
    nature: "thin_section",
    type: "individual_sample",
    material:
      "extraterrestrial_rock.meteorites.achondrites.stony_achondrite.lunar_meteorite.basalt",
    collectionMethod: "manual",
    specificName: "MIL-2024-01",
    location: {
      position: point(160.0, -76.7),
      region: { kind: "continent", country: "AQ" },
    },
    description: on("2024-12-20"),
    availability: "exists",
  },
  // Extraterrestrial returned samples (location optional; mission-collected).
  {
    name: "Apollo 15 Mare Basalt",
    nature: "hand_sample",
    type: "individual_sample",
    material: "extraterrestrial_rock.returned_samples.lunar_sample.rock",
    collectionMethod: "spatial_mission",
    specificName: "Apollo 15 / 15555",
    description: on("2024-05-01"),
    availability: "exists",
  },
  {
    name: "Apollo 17 Lunar Soil",
    nature: "separated_materials",
    type: "individual_sample",
    material: "extraterrestrial_rock.returned_samples.lunar_sample.soil",
    collectionMethod: "spatial_mission",
    specificName: "Apollo 17 / 70017",
    description: on("2024-05-02"),
    availability: "exists",
  },
  {
    name: "Hayabusa2 Ryugu Grain",
    nature: "sample_fragment",
    type: "individual_sample",
    material: "extraterrestrial_rock.returned_samples.asteroid.ryugu",
    collectionMethod: "spatial_mission",
    specificName: "Hayabusa2 / C0002",
    description: on("2025-01-05"),
    availability: "exists",
  },
  {
    name: "OSIRIS-REx Bennu Grain",
    nature: "sample_fragment",
    type: "individual_sample",
    material: "extraterrestrial_rock.returned_samples.asteroid.bennu",
    collectionMethod: "spatial_mission",
    specificName: "OSIRIS-REx",
    description: on("2025-01-06"),
    availability: "exists",
  },
  {
    name: "Hayabusa Itokawa Grain",
    nature: "sample_fragment",
    type: "individual_sample",
    material: "extraterrestrial_rock.returned_samples.asteroid.itokawa",
    collectionMethod: "spatial_mission",
    specificName: "Hayabusa / RA-QD02",
    description: on("2024-04-15"),
    availability: "exists",
  },
  // Remaining coverage: legacy/unknown method, towed camera, sediment trap,
  // suspended sediment, drilled basement, box corer; an area with an elevation
  // range; a sample that no longer exists.
  {
    name: "Legacy Archive Basalt",
    nature: "hand_sample",
    type: "individual_sample",
    material: "rock.igneous.volcanic.mafic.basalt",
    texture: "aphanitic",
    collectionMethod: "unknown",
    location: {
      position: point(2.5, 45.0),
      region: { kind: "continent", country: "FR" },
    },
    description: on("2024-01-10"),
    availability: "no_longer_exists",
  },
  {
    name: "Camera-Tow Ridge Basalt",
    nature: "rock_chips",
    type: "dredge",
    material: "rock.igneous.volcanic.mafic.basalt",
    texture: "vesicular",
    collectionMethod: "camera_sled_camera_tow",
    location: {
      position: area(-45.2, -44.6, 25.8, 26.4, elev(-3600, -3400, "m", "msl")),
      region: { kind: "ocean", oceanSea: "atlantic_ocean" },
      navigationType: "GPS",
    },
    description: on("2025-03-28"),
    availability: "exists",
  },
  {
    name: "Sediment Trap Particulate",
    nature: "separated_materials",
    type: "individual_sample",
    material: "sediment.biogenic.siliceous.diatoms",
    collectionMethod: "sediment_trap",
    location: {
      position: point(-25.0, 49.0, elev(-1000, -1000, "m", "msl")),
      region: { kind: "ocean", oceanSea: "atlantic_ocean" },
      navigationType: "GPS",
    },
    description: on("2024-10-01"),
    availability: "exists",
  },
  {
    name: "Rhone Suspended Sediment",
    nature: "residue",
    type: "individual_sample",
    material: "sediment.exogenous_detritic.silt.fine_silt",
    collectionMethod: "suspended_sediment",
    location: {
      position: point(4.85, 45.75),
      region: { kind: "continent", country: "FR" },
    },
    description: on("2025-04-02"),
    availability: "exists",
  },
  {
    name: "IODP Basement Gabbro",
    nature: "thin_section",
    type: "core.whole_round",
    material: "rock.igneous.plutonic.mafic.gabbro",
    texture: "phaneritic",
    collectionMethod: "coring.drill_corer",
    specificName: "IODP-U1309D",
    collectionMethodDescription: "Rotary drill core, 3.2 m recovery",
    location: {
      position: point(-46.0, 23.0, elev(-4200, -4200, "m", "msl")),
      region: { kind: "ocean", oceanSea: "atlantic_ocean" },
      navigationType: "GPS",
    },
    description: on("2024-11-05"),
    availability: "exists",
  },
  {
    name: "Biscay Shelf Sand Boxcore",
    nature: "sem_mount",
    type: "core.piece",
    material: "sediment.exogenous_detritic.sand.fine_sand",
    collectionMethod: "coring.box_corer",
    location: {
      position: point(-4.0, 48.5, elev(-120, -120, "m", "msl")),
      region: { kind: "ocean", oceanSea: "bay_of_biscay" },
      navigationType: "GPS",
    },
    description: on("2025-02-15"),
    availability: "exists",
  },
];

// 30 work-in-progress drafts: name + nature always, the rest partial or
// deliberately non-leaf. Each still passes createSampleSchema (draft bar). No
// igsn, published = false.
const DRAFTS: DemoRow[] = [
  { name: "Unclassified field sample 001", nature: "hand_sample" },
  {
    name: "Volcano flank sample (classification pending)",
    nature: "rock_chips",
    material: "rock.igneous.volcanic",
    texture: "aphanitic",
  },
  {
    name: "Metamorphic outcrop (facies TBD)",
    nature: "thin_section",
    material: "rock.metamorphic",
    metamorphicFacies: "greenschist",
  },
  {
    name: "Sediment core top (unlogged)",
    nature: "sample_fragment",
    material: "sediment",
    type: "core",
  },
  {
    name: "Quarry block awaiting section",
    nature: "hand_sample",
    material: "rock.igneous.plutonic",
    texture: "phaneritic",
    collectionMethod: "blasting",
  },
  {
    name: "Regional survey point",
    nature: "multiple_sample",
    location: { region: { kind: "continent", country: "FR" } },
  },
  {
    name: "Cave locality note",
    nature: "hand_sample",
    location: { localityName: "Vercors karst network" },
  },
  {
    name: "Point-only draft",
    nature: "rock_powder",
    location: { position: point(3.0, 45.0) },
  },
  {
    name: "Partial elevation record",
    nature: "hand_sample",
    location: { position: point(2.0, 46.0, { min: -100 }) },
  },
  { name: "Unclassified mineral", nature: "hand_sample", material: "mineral" },
  {
    name: "Coring campaign (unclassified)",
    nature: "separated_materials",
    collectionMethod: "coring",
  },
  { name: "Legacy residue", nature: "residue" },
  { name: "Rock of unknown type", nature: "hand_sample", material: "rock" },
  {
    name: "Schist draft (no facies yet)",
    nature: "thin_section",
    material: "rock.metamorphic.strongly_metamorphosed.schist",
  },
  {
    name: "Ash deposit draft",
    nature: "rock_powder",
    material: "sediment.volcano_detritic.ash",
  },
  { name: "Fossil pending study", nature: "hand_sample", material: "fossil" },
  {
    name: "Extraterrestrial sample (unclassified)",
    nature: "hand_sample",
    material: "extraterrestrial_rock",
  },
  {
    name: "Area-location draft",
    nature: "hand_sample",
    location: { position: area(-1.0, 1.0, 44.0, 46.0) },
  },
  {
    name: "Locality-description draft",
    nature: "hand_sample",
    location: { localityDescription: "Near the old mine entrance" },
  },
  {
    name: "Clastic sedimentary draft",
    nature: "rock_chips",
    material: "rock.sedimentary.clastic_sedimentary_rock",
  },
  {
    name: "Collection-date-only draft",
    nature: "hand_sample",
    description: on("2024-03-03"),
  },
  {
    name: "Felsic pluton draft",
    nature: "hand_sample",
    material: "rock.igneous.plutonic.felsic",
    collectionMethod: "manual",
  },
  {
    name: "Hydrothermal vent draft",
    nature: "hand_sample",
    material: "rock.hydrothermal",
  },
  {
    name: "Dredge haul draft",
    nature: "rock_chips",
    type: "dredge",
    material: "rock.igneous.volcanic.mafic",
  },
  {
    name: "Synthetic phase draft",
    nature: "hand_sample",
    material: "synthetic_rock_mineral",
  },
  {
    name: "Sample series draft",
    nature: "multiple_sample",
    type: "serie_of_sample",
  },
  {
    name: "Meteorite draft (chondrite?)",
    nature: "sample_fragment",
    material: "extraterrestrial_rock.meteorites.chondrites",
  },
  {
    name: "Navigated point draft",
    nature: "hand_sample",
    location: {
      position: point(-20.0, 50.0),
      region: { kind: "ocean", oceanSea: "atlantic_ocean" },
      navigationType: "GPS",
    },
  },
  {
    name: "Inapplicable-nature draft",
    nature: "inapplicable",
    material: "mineral",
  },
  { name: "Draft awaiting everything", nature: "thick_section" },
];

// Deterministic UUIDv7-shaped id from the index (version nibble 7, variant 8),
// distinct from SEED_SAMPLES ids. Index fits in the 12-hex node field.
const demoId = (index: number): string =>
  `019f5b01-0000-7000-8000-${index.toString(16).padStart(12, "0")}`;

// Publish requires a scientific context; published demo rows alternate the two
// provenance branches so the walkthrough shows both. ROR ids from ORGANIZATIONS
// (same as SEED_SAMPLES).
const RECENT_CONTEXT: SeedSample["scientificContext"] = {
  provenanceStatus: "recent_collection",
  funderOrganization: "02feahw73",
  researchProgramName: "Solid Earth Demo Survey",
  researchProgramChief: "Jean Dupont",
  researchStructure: ["02rx3b187"],
  collectorName: "Claire Martin",
};

const HISTORICAL_CONTEXT: SeedSample["scientificContext"] = {
  provenanceStatus: "historical_specimen",
  collectionCurator: "Paul Bernard",
  collectionOrigin: "scientific_expedition",
};

// The first PUBLISHED.length rows publish (igsn derived from the id as publish
// does); the drafts follow with no igsn.
export const DEMO_SAMPLES: SeedSample[] = [...PUBLISHED, ...DRAFTS].map(
  (row, index) => {
    const id = demoId(index);
    const published = index < PUBLISHED.length;
    return {
      ...row,
      id,
      published,
      ...(published
        ? {
            igsn: generateIgsnSuffix(id),
            scientificContext:
              row.scientificContext ??
              (index % 2 === 0 ? RECENT_CONTEXT : HISTORICAL_CONTEXT),
          }
        : {}),
    };
  },
);
