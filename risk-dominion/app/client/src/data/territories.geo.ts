// The 12 game territories as real-world geography. Built from the Natural Earth
// 110m country boundaries (via `world-atlas`), grouping countries into the 12
// territories and dissolving internal borders with topojson `merge`. The result
// is a GeoJSON FeatureCollection of recognizable continent-scale landmasses that
// d3-geo projects into the map.

import { merge } from "topojson-client";
import topoData from "world-atlas/countries-110m.json";
import type { FeatureCollection, MultiPolygon } from "geojson";

export interface TerritoryProps {
  territory_id: number;
  name: string;
  continent: string;
}

// Each territory is the union of these countries (Natural Earth `name` values).
// Together the groups tile the inhabited world, so the map reads as a real atlas.
const GROUPS: { id: number; name: string; continent: string; countries: string[] }[] = [
  {
    id: 1,
    name: "North America",
    continent: "Americas",
    countries: ["Canada", "United States of America", "Greenland"],
  },
  {
    id: 2,
    name: "Central America",
    continent: "Americas",
    countries: ["Mexico", "Guatemala", "Belize", "Honduras", "El Salvador", "Nicaragua", "Costa Rica", "Panama"],
  },
  {
    id: 3,
    name: "Caribbean",
    continent: "Americas",
    countries: ["Cuba", "Haiti", "Dominican Rep.", "Jamaica", "Puerto Rico", "Bahamas", "Trinidad and Tobago"],
  },
  {
    id: 4,
    name: "South America",
    continent: "Americas",
    countries: [
      "Colombia", "Venezuela", "Guyana", "Suriname", "Ecuador", "Peru", "Brazil",
      "Bolivia", "Paraguay", "Chile", "Argentina", "Uruguay", "Falkland Is.",
    ],
  },
  {
    id: 5,
    name: "Western Europe",
    continent: "Europe-Africa",
    countries: [
      "Portugal", "Spain", "France", "Ireland", "United Kingdom", "Belgium", "Netherlands",
      "Luxembourg", "Germany", "Switzerland", "Austria", "Italy", "Denmark", "Norway",
      "Sweden", "Finland", "Iceland",
    ],
  },
  {
    id: 6,
    name: "North Africa",
    continent: "Europe-Africa",
    countries: ["Morocco", "W. Sahara", "Algeria", "Tunisia", "Libya", "Egypt", "Mauritania", "Mali", "Niger", "Chad", "Sudan"],
  },
  {
    id: 7,
    name: "Southern Africa",
    continent: "Europe-Africa",
    countries: [
      "Senegal", "Gambia", "Guinea-Bissau", "Guinea", "Sierra Leone", "Liberia", "Côte d'Ivoire",
      "Burkina Faso", "Ghana", "Togo", "Benin", "Nigeria", "Cameroon", "Eq. Guinea", "Gabon",
      "Congo", "Dem. Rep. Congo", "Central African Rep.", "S. Sudan", "Ethiopia", "Eritrea",
      "Djibouti", "Somalia", "Somaliland", "Kenya", "Uganda", "Rwanda", "Burundi", "Tanzania",
      "Angola", "Zambia", "Malawi", "Mozambique", "Zimbabwe", "Botswana", "Namibia",
      "South Africa", "Lesotho", "eSwatini", "Madagascar",
    ],
  },
  {
    id: 8,
    name: "Eastern Europe",
    continent: "Asia-Oceania",
    countries: [
      "Poland", "Czechia", "Slovakia", "Hungary", "Romania", "Bulgaria", "Greece", "Albania",
      "Macedonia", "Kosovo", "Serbia", "Montenegro", "Bosnia and Herz.", "Croatia", "Slovenia",
      "Ukraine", "Belarus", "Lithuania", "Latvia", "Estonia", "Moldova", "Russia",
    ],
  },
  {
    id: 9,
    name: "Middle East",
    continent: "Asia-Oceania",
    countries: [
      "Turkey", "Cyprus", "N. Cyprus", "Syria", "Lebanon", "Israel", "Palestine", "Jordan",
      "Iraq", "Iran", "Saudi Arabia", "Yemen", "Oman", "United Arab Emirates", "Qatar", "Kuwait",
      "Georgia", "Armenia", "Azerbaijan",
    ],
  },
  {
    id: 10,
    name: "South Asia",
    continent: "Asia-Oceania",
    countries: ["Afghanistan", "Pakistan", "India", "Nepal", "Bhutan", "Bangladesh", "Sri Lanka"],
  },
  {
    id: 11,
    name: "East Asia",
    continent: "Asia-Oceania",
    countries: [
      "China", "Mongolia", "Kazakhstan", "Uzbekistan", "Turkmenistan", "Tajikistan", "Kyrgyzstan",
      "North Korea", "South Korea", "Japan", "Taiwan", "Myanmar", "Thailand", "Laos", "Vietnam",
      "Cambodia", "Malaysia", "Brunei", "Indonesia", "Philippines", "Timor-Leste",
    ],
  },
  {
    id: 12,
    name: "Oceania",
    continent: "Asia-Oceania",
    countries: ["Australia", "New Zealand", "Papua New Guinea", "New Caledonia"],
  },
];

// topojson typings are loose here; the data shape is known to be valid.
type MergeTopo = Parameters<typeof merge>[0];
type MergeGeoms = Parameters<typeof merge>[1];
const topo = topoData as unknown as MergeTopo;
const geometries = (
  topoData as unknown as {
    objects: { countries: { geometries: { properties?: { name?: string } }[] } };
  }
).objects.countries.geometries;

function buildCollection(): FeatureCollection<MultiPolygon, TerritoryProps> {
  const features = GROUPS.map((g) => {
    const members = geometries.filter((geo) => g.countries.includes(geo.properties?.name ?? ""));
    const geometry = merge(topo, members as unknown as MergeGeoms) as MultiPolygon;
    return {
      type: "Feature" as const,
      properties: { territory_id: g.id, name: g.name, continent: g.continent },
      geometry,
    };
  });
  return { type: "FeatureCollection", features };
}

export const TERRITORIES_GEOJSON: FeatureCollection<MultiPolygon, TerritoryProps> = buildCollection();
