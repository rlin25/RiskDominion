// Hand-authored GeoJSON for the 12 game territories. Coordinates are placed at
// roughly real-world [lon, lat] positions so geoEqualEarth().fitExtent renders
// recognizable continent shapes, and so that territories adjacent per ADJACENCY
// visually border one another. Rings are simple (no holes, no self-intersection),
// wound counter-clockwise, with first == last. Borders are deliberately jagged.

import type { FeatureCollection, Feature, Polygon } from "geojson";

export interface TerritoryProps {
  territory_id: number;
  name: string;
  continent: string;
}

// Signed area (shoelace) in lon/lat space. Positive == counter-clockwise.
function signedArea(ring: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

// Small helper to keep the feature list readable. `ring` is the outer ring of
// [lon, lat] pairs; the closing point (== first) is appended automatically.
//
// d3-geo interprets a polygon ring on the sphere as enclosing the region to its
// LEFT, so a small "island" outer ring must be wound CLOCKWISE in lon/lat terms
// (a counter-clockwise ring would describe the entire globe minus the island).
// We normalize every authored ring to clockwise here so each territory renders
// as a small filled polygon regardless of the order it was typed in.
function feature(
  territory_id: number,
  name: string,
  continent: string,
  ring: [number, number][],
): Feature<Polygon, TerritoryProps> {
  const cw = signedArea(ring) > 0 ? [...ring].reverse() : [...ring];
  const closed = [...cw, cw[0]];
  return {
    type: "Feature",
    properties: { territory_id, name, continent },
    geometry: { type: "Polygon", coordinates: [closed] },
  };
}

export const TERRITORIES_GEOJSON: FeatureCollection<Polygon, TerritoryProps> = {
  type: "FeatureCollection",
  features: [
    // 1 North America (~ -110..-60 lon, 30..62 lat)
    feature(1, "North America", "Americas", [
      [-110, 32],
      [-100, 30],
      [-83, 31],
      [-72, 38],
      [-62, 47],
      [-70, 58],
      [-88, 62],
      [-104, 58],
      [-112, 48],
      [-108, 39],
    ]),

    // 2 Central America (~ -105..-83 lon, 8..22 lat)
    feature(2, "Central America", "Americas", [
      [-104, 9],
      [-95, 8],
      [-86, 11],
      [-83, 16],
      [-88, 21],
      [-97, 22],
      [-105, 18],
      [-103, 13],
    ]),

    // 3 Caribbean (~ -85..-60 lon, 12..26 lat)
    feature(3, "Caribbean", "Americas", [
      [-84, 13],
      [-74, 12],
      [-63, 15],
      [-60, 21],
      [-66, 26],
      [-77, 25],
      [-83, 21],
      [-85, 16],
    ]),

    // 4 South America (~ -78..-38 lon, -40..8 lat)
    feature(4, "South America", "Americas", [
      [-76, 6],
      [-64, 8],
      [-50, 4],
      [-39, -8],
      [-43, -24],
      [-55, -38],
      [-68, -40],
      [-73, -24],
      [-78, -8],
      [-77, 0],
    ]),

    // 5 Western Europe (~ -10..18 lon, 40..58 lat)
    feature(5, "Western Europe", "Europe-Africa", [
      [-9, 42],
      [0, 40],
      [10, 41],
      [18, 46],
      [16, 53],
      [7, 58],
      [-4, 56],
      [-10, 49],
    ]),

    // 6 North Africa (~ -12..30 lon, 14..34 lat)
    feature(6, "North Africa", "Europe-Africa", [
      [-12, 16],
      [-2, 14],
      [12, 15],
      [26, 18],
      [30, 26],
      [22, 33],
      [6, 34],
      [-8, 31],
      [-13, 23],
    ]),

    // 7 Southern Africa (~ 12..40 lon, -34..0 lat)
    feature(7, "Southern Africa", "Europe-Africa", [
      [13, -2],
      [25, 0],
      [38, -4],
      [40, -16],
      [33, -28],
      [22, -34],
      [12, -27],
      [11, -13],
    ]),

    // 8 Eastern Europe (~ 20..55 lon, 44..60 lat)
    feature(8, "Eastern Europe", "Europe-Africa", [
      [21, 46],
      [33, 44],
      [46, 46],
      [55, 51],
      [52, 58],
      [38, 60],
      [25, 57],
      [19, 51],
    ]),

    // 9 Middle East (~ 35..60 lon, 22..40 lat)
    feature(9, "Middle East", "Asia-Oceania", [
      [36, 24],
      [46, 22],
      [57, 25],
      [60, 32],
      [54, 38],
      [43, 40],
      [36, 35],
      [34, 29],
    ]),

    // 10 South Asia (~ 66..90 lon, 8..32 lat)
    feature(10, "South Asia", "Asia-Oceania", [
      [67, 11],
      [77, 8],
      [88, 12],
      [90, 22],
      [85, 30],
      [74, 32],
      [66, 27],
      [65, 18],
    ]),

    // 11 East Asia (~ 100..142 lon, 28..50 lat)
    feature(11, "East Asia", "Asia-Oceania", [
      [101, 30],
      [114, 28],
      [130, 31],
      [142, 39],
      [137, 48],
      [122, 50],
      [106, 47],
      [99, 39],
    ]),

    // 12 Oceania (~ 112..154 lon, -40..-12 lat)
    feature(12, "Oceania", "Asia-Oceania", [
      [114, -16],
      [128, -12],
      [144, -14],
      [154, -24],
      [148, -36],
      [133, -40],
      [118, -36],
      [112, -25],
    ]),
  ],
};
