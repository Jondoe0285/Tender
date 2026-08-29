// Approximate town centroids for distance estimation only — not a real geocoding service.
// Coverage is limited to common UK construction hubs; unmatched towns return an unknown distance.
export const UK_COUNTIES = [
  'Bedfordshire',
  'Berkshire',
  'Bristol',
  'Buckinghamshire',
  'Cambridgeshire',
  'Cheshire',
  'Cleveland',
  'Cornwall',
  'Cumbria',
  'Derbyshire',
  'Devon',
  'Dorset',
  'Durham',
  'East Sussex',
  'Essex',
  'Gloucestershire',
  'Greater London',
  'Greater Manchester',
  'Hampshire',
  'Hereford and Worcester',
  'Hertfordshire',
  'Humberside',
  'Isle of Wight',
  'Kent',
  'Lancashire',
  'Leicestershire',
  'Lincolnshire',
  'Merseyside',
  'Middlesex',
  'Milton Keynes',
  'Norfolk',
  'North Yorkshire',
  'Northamptonshire',
  'Northumberland',
  'Nottinghamshire',
  'Oxfordshire',
  'Peterborough',
  'Rutland',
  'Shropshire',
  'Somerset',
  'South Yorkshire',
  'Staffordshire',
  'Suffolk',
  'Surrey',
  'Tyne and Wear',
  'Warwickshire',
  'West Midlands',
  'West Sussex',
  'West Yorkshire',
  'Wiltshire',
  'Worcestershire',
  'Yorkshire',
];

const TOWN_COORDINATES: Record<string, { lat: number; lon: number }> = {
  leeds: { lat: 53.7997, lon: -1.5492 },
  manchester: { lat: 53.4808, lon: -2.2426 },
  sheffield: { lat: 53.3811, lon: -1.4701 },
  york: { lat: 53.9600, lon: -1.0873 },
  bradford: { lat: 53.7960, lon: -1.7594 },
  wakefield: { lat: 53.6833, lon: -1.4977 },
  huddersfield: { lat: 53.6458, lon: -1.7850 },
  bristol: { lat: 51.4545, lon: -2.5879 },
  london: { lat: 51.5072, lon: -0.1276 },
  birmingham: { lat: 52.4862, lon: -1.8904 },
  liverpool: { lat: 53.4084, lon: -2.9916 },
  newcastle: { lat: 54.9783, lon: -1.6178 },
  nottingham: { lat: 52.9548, lon: -1.1581 },
  leicester: { lat: 52.6369, lon: -1.1398 },
  hull: { lat: 53.7676, lon: -0.3274 },
  preston: { lat: 53.7632, lon: -2.7031 },
};

function normalizeTownName(value: string): string {
  return value.trim().toLowerCase();
}

const UK_POSTCODE_PATTERN = /\b(?:GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/i;

export function extractPostcode(location: string): string | null {
  const postcode = location.match(UK_POSTCODE_PATTERN)?.[0];
  return postcode ? postcode.toUpperCase().replace(/\s+/g, ' ').trim() : null;
}

export function locationHasPostcode(location: string): boolean {
  return extractPostcode(location) !== null;
}

/** Returns a broad town/area label suitable for pre-unlock opportunity views. */
export function getBroadLocation(location: string): string {
  const normalized = location.trim();
  const knownTown = Object.keys(TOWN_COORDINATES).find((town) => normalized.toLowerCase().includes(town));
  if (knownTown) return knownTown.replace(/\b\w/g, (letter) => letter.toUpperCase());

  const withoutPostcode = normalized.replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi, '').trim();
  const area = withoutPostcode.split(',')[0]?.trim();
  return area || 'Location area available after unlock';
}

/** Finds the first known town name contained within free-text location/coverage strings. */
function findKnownTown(value: string): { lat: number; lon: number } | null {
  const normalized = normalizeTownName(value);
  for (const [town, coords] of Object.entries(TOWN_COORDINATES)) {
    if (normalized.includes(town)) return coords;
  }
  return null;
}

function haversineDistanceMiles(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const earthRadiusMiles = 3958.8;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusMiles * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Estimates the nearest distance (in miles) between a Retailer's coverage areas and a tender
 * location, using a small static town lookup. Returns null when either side isn't recognised —
 * this is an approximation, not real geocoding.
 */
export function estimateDistanceMiles(coverageAreas: string, tenderLocation: string): number | null {
  const tenderCoords = findKnownTown(tenderLocation);
  if (!tenderCoords) return null;

  const coverageTowns = coverageAreas
    .split(',')
    .map((town) => town.trim())
    .filter(Boolean);

  let nearest: number | null = null;
  for (const town of coverageTowns) {
    const coords = findKnownTown(town);
    if (!coords) continue;
    const distance = haversineDistanceMiles(coords, tenderCoords);
    if (nearest === null || distance < nearest) nearest = distance;
  }
  return nearest;
}

export const UK_REGIONS = [
  'London',
  'South East',
  'South West',
  'East of England',
  'East Midlands',
  'West Midlands',
  'Yorkshire and The Humber',
  'North East',
  'North West',
  'Wales',
  'Scotland',
  'Northern Ireland',
  'Channel Islands & Isle of Man',
];

// Maps each UK postcode area (the letters before the district number, e.g. "LS" in "LS10 2AB")
// to its historic county — approximate, England-only, and aligned to UK_COUNTIES above.
const POSTCODE_AREA_TO_COUNTY: Record<string, string> = {
  AL: 'Hertfordshire', B: 'West Midlands', BA: 'Somerset', BB: 'Lancashire', BD: 'West Yorkshire',
  BH: 'Dorset', BL: 'Greater Manchester', BN: 'East Sussex', BR: 'Greater London', BS: 'Bristol',
  CA: 'Cumbria', CB: 'Cambridgeshire', CH: 'Cheshire', CM: 'Essex', CO: 'Essex', CR: 'Greater London',
  CT: 'Kent', CV: 'Warwickshire', CW: 'Cheshire', DA: 'Kent', DE: 'Derbyshire', DH: 'Durham',
  DL: 'Durham', DN: 'South Yorkshire', DT: 'Dorset', DY: 'West Midlands', E: 'Greater London',
  EC: 'Greater London', EN: 'Greater London', EX: 'Devon', FY: 'Lancashire', GL: 'Gloucestershire',
  GU: 'Surrey', HA: 'Greater London', HD: 'West Yorkshire', HG: 'North Yorkshire', HP: 'Hertfordshire',
  HR: 'Hereford and Worcester', HU: 'Humberside', HX: 'West Yorkshire', IG: 'Greater London',
  IP: 'Suffolk', KT: 'Greater London', L: 'Merseyside', LA: 'Lancashire', LE: 'Leicestershire',
  LN: 'Lincolnshire', LS: 'West Yorkshire', LU: 'Bedfordshire', M: 'Greater Manchester', ME: 'Kent',
  MK: 'Buckinghamshire', N: 'Greater London', NE: 'Tyne and Wear', NG: 'Nottinghamshire',
  NN: 'Northamptonshire', NR: 'Norfolk', NW: 'Greater London', OL: 'Greater Manchester',
  OX: 'Oxfordshire', PE: 'Peterborough', PL: 'Devon', PO: 'Hampshire', PR: 'Lancashire',
  RG: 'Berkshire', RH: 'Surrey', RM: 'Greater London', S: 'South Yorkshire', SE: 'Greater London',
  SG: 'Hertfordshire', SK: 'Greater Manchester', SL: 'Berkshire', SM: 'Greater London',
  SN: 'Wiltshire', SO: 'Hampshire', SP: 'Wiltshire', SR: 'Tyne and Wear', SS: 'Essex',
  ST: 'Staffordshire', SW: 'Greater London', SY: 'Shropshire', TA: 'Somerset', TF: 'Shropshire',
  TN: 'Kent', TQ: 'Devon', TR: 'Cornwall', TS: 'Cleveland', TW: 'Greater London', UB: 'Greater London',
  W: 'Greater London', WA: 'Cheshire', WC: 'Greater London', WD: 'Hertfordshire', WF: 'West Yorkshire',
  WN: 'Greater Manchester', WR: 'Hereford and Worcester', WS: 'West Midlands', WV: 'West Midlands',
  YO: 'North Yorkshire',
};

// Maps each UK postcode area to one of the 12 official UK regions/nations, plus the Crown
// Dependencies — approximate, for coarse coverage matching only.
const POSTCODE_AREA_TO_REGION: Record<string, string> = {
  BR: 'London', CR: 'London', E: 'London', EC: 'London', EN: 'London', HA: 'London', IG: 'London',
  KT: 'London', N: 'London', NW: 'London', RM: 'London', SE: 'London', SM: 'London', SW: 'London',
  TW: 'London', UB: 'London', W: 'London', WC: 'London',
  DA: 'South East', GU: 'South East', ME: 'South East', MK: 'South East', OX: 'South East',
  PO: 'South East', RG: 'South East', RH: 'South East', SL: 'South East', SO: 'South East',
  TN: 'South East', BN: 'South East', CT: 'South East',
  BA: 'South West', BH: 'South West', BS: 'South West', DT: 'South West', EX: 'South West',
  GL: 'South West', PL: 'South West', SN: 'South West', SP: 'South West', TA: 'South West',
  TQ: 'South West', TR: 'South West',
  AL: 'East of England', CB: 'East of England', CM: 'East of England', CO: 'East of England',
  HP: 'East of England', IP: 'East of England', LU: 'East of England', NR: 'East of England',
  PE: 'East of England', SG: 'East of England', SS: 'East of England', WD: 'East of England',
  B: 'West Midlands', CV: 'West Midlands', DY: 'West Midlands', HR: 'West Midlands',
  ST: 'West Midlands', SY: 'West Midlands', TF: 'West Midlands', WR: 'West Midlands',
  WS: 'West Midlands', WV: 'West Midlands',
  DE: 'East Midlands', LE: 'East Midlands', LN: 'East Midlands', NG: 'East Midlands', NN: 'East Midlands',
  BD: 'Yorkshire and The Humber', DN: 'Yorkshire and The Humber', HD: 'Yorkshire and The Humber',
  HG: 'Yorkshire and The Humber', HU: 'Yorkshire and The Humber', HX: 'Yorkshire and The Humber',
  LS: 'Yorkshire and The Humber', S: 'Yorkshire and The Humber', WF: 'Yorkshire and The Humber',
  YO: 'Yorkshire and The Humber',
  DH: 'North East', DL: 'North East', NE: 'North East', SR: 'North East', TS: 'North East',
  BB: 'North West', BL: 'North West', CA: 'North West', CH: 'North West', CW: 'North West',
  FY: 'North West', L: 'North West', LA: 'North West', M: 'North West', OL: 'North West',
  PR: 'North West', SK: 'North West', WA: 'North West', WN: 'North West',
  CF: 'Wales', LD: 'Wales', LL: 'Wales', NP: 'Wales', SA: 'Wales',
  AB: 'Scotland', DD: 'Scotland', DG: 'Scotland', EH: 'Scotland', FK: 'Scotland', G: 'Scotland',
  HS: 'Scotland', IV: 'Scotland', KA: 'Scotland', KW: 'Scotland', KY: 'Scotland', ML: 'Scotland',
  PA: 'Scotland', PH: 'Scotland', TD: 'Scotland', ZE: 'Scotland',
  BT: 'Northern Ireland',
  GY: 'Channel Islands & Isle of Man', IM: 'Channel Islands & Isle of Man', JE: 'Channel Islands & Isle of Man',
};

// Maps major UK construction towns/cities to county and region for location matching without full postcodes.
const TOWN_LOCATION_MAP: Record<string, { county: string; region: string }> = {
  leeds: { county: 'West Yorkshire', region: 'Yorkshire and The Humber' },
  manchester: { county: 'Greater Manchester', region: 'North West' },
  sheffield: { county: 'South Yorkshire', region: 'Yorkshire and The Humber' },
  york: { county: 'North Yorkshire', region: 'Yorkshire and The Humber' },
  bradford: { county: 'West Yorkshire', region: 'Yorkshire and The Humber' },
  wakefield: { county: 'West Yorkshire', region: 'Yorkshire and The Humber' },
  huddersfield: { county: 'West Yorkshire', region: 'Yorkshire and The Humber' },
  bristol: { county: 'Bristol', region: 'South West' },
  london: { county: 'Greater London', region: 'London' },
  birmingham: { county: 'West Midlands', region: 'West Midlands' },
  liverpool: { county: 'Merseyside', region: 'North West' },
  newcastle: { county: 'Tyne and Wear', region: 'North East' },
  nottingham: { county: 'Nottinghamshire', region: 'East Midlands' },
  leicester: { county: 'Leicestershire', region: 'East Midlands' },
  hull: { county: 'Humberside', region: 'Yorkshire and The Humber' },
  preston: { county: 'Lancashire', region: 'North West' },
  'milton keynes': { county: 'Milton Keynes', region: 'South East' },
  oxford: { county: 'Oxfordshire', region: 'South East' },
  cambridge: { county: 'Cambridgeshire', region: 'East of England' },
  peterborough: { county: 'Peterborough', region: 'East of England' },
  reading: { county: 'Berkshire', region: 'South East' },
  southampton: { county: 'Hampshire', region: 'South East' },
  portsmouth: { county: 'Hampshire', region: 'South East' },
  brighton: { county: 'East Sussex', region: 'South East' },
  plymouth: { county: 'Devon', region: 'South West' },
  exeter: { county: 'Devon', region: 'South West' },
  gloucester: { county: 'Gloucestershire', region: 'South West' },
  cardiff: { county: 'Wales', region: 'Wales' },
  swansea: { county: 'Wales', region: 'Wales' },
  edinburgh: { county: 'Scotland', region: 'Scotland' },
  glasgow: { county: 'Scotland', region: 'Scotland' },
  belfast: { county: 'Northern Ireland', region: 'Northern Ireland' },
};

// Maps UK counties to official UK regions/nations.
const COUNTY_TO_REGION: Record<string, string> = {
  Bedfordshire: 'East of England',
  Berkshire: 'South East',
  Bristol: 'South West',
  Buckinghamshire: 'South East',
  Cambridgeshire: 'East of England',
  Cheshire: 'North West',
  Cleveland: 'North East',
  Cornwall: 'South West',
  Cumbria: 'North West',
  Derbyshire: 'East Midlands',
  Devon: 'South West',
  Dorset: 'South West',
  Durham: 'North East',
  'East Sussex': 'South East',
  Essex: 'East of England',
  Gloucestershire: 'South West',
  'Greater London': 'London',
  'Greater Manchester': 'North West',
  Hampshire: 'South East',
  'Hereford and Worcester': 'West Midlands',
  Hertfordshire: 'East of England',
  Humberside: 'Yorkshire and The Humber',
  'Isle of Wight': 'South East',
  Kent: 'South East',
  Lancashire: 'North West',
  Leicestershire: 'East Midlands',
  Lincolnshire: 'East Midlands',
  Merseyside: 'North West',
  Middlesex: 'London',
  'Milton Keynes': 'South East',
  Norfolk: 'East of England',
  'North Yorkshire': 'Yorkshire and The Humber',
  Northamptonshire: 'East Midlands',
  Northumberland: 'North East',
  Nottinghamshire: 'East Midlands',
  Oxfordshire: 'South East',
  Peterborough: 'East of England',
  Rutland: 'East Midlands',
  Shropshire: 'West Midlands',
  Somerset: 'South West',
  'South Yorkshire': 'Yorkshire and The Humber',
  Staffordshire: 'West Midlands',
  Suffolk: 'East of England',
  Surrey: 'South East',
  'Tyne and Wear': 'North East',
  Warwickshire: 'West Midlands',
  'West Midlands': 'West Midlands',
  'West Sussex': 'South East',
  'West Yorkshire': 'Yorkshire and The Humber',
  Wiltshire: 'South West',
  Worcestershire: 'West Midlands',
  Yorkshire: 'Yorkshire and The Humber',
};

/** Extracts just the postcode area letters (e.g. "LS" from "LS10 2AB"); null when no postcode is present. */
export function getPostcodeAreaCode(location: string): string | null {
  const postcode = extractPostcode(location)?.replace(/\s+/g, '');
  return postcode?.match(/^[A-Z]{1,2}/i)?.[0].toUpperCase() ?? null;
}

/** Resolves a tender location's historic county from its postcode, town, or county name. */
export function getCountyForPostcode(location: string): string | null {
  const area = getPostcodeAreaCode(location);
  if (area && POSTCODE_AREA_TO_COUNTY[area]) {
    return POSTCODE_AREA_TO_COUNTY[area];
  }

  const normalized = location.trim().toLowerCase();
  for (const [town, info] of Object.entries(TOWN_LOCATION_MAP)) {
    if (normalized.includes(town)) return info.county;
  }

  for (const county of UK_COUNTIES) {
    if (normalized.includes(county.toLowerCase())) return county;
  }

  return null;
}

/** Resolves a tender location's UK region/nation from its postcode, town, county, or region name. */
export function getRegionForPostcode(location: string): string | null {
  const area = getPostcodeAreaCode(location);
  if (area && POSTCODE_AREA_TO_REGION[area]) {
    return POSTCODE_AREA_TO_REGION[area];
  }

  const normalized = location.trim().toLowerCase();
  for (const [town, info] of Object.entries(TOWN_LOCATION_MAP)) {
    if (normalized.includes(town)) return info.region;
  }

  for (const region of UK_REGIONS) {
    if (normalized.includes(region.toLowerCase())) return region;
  }

  const county = getCountyForPostcode(location);
  if (county && COUNTY_TO_REGION[county]) {
    return COUNTY_TO_REGION[county];
  }

  return null;
}

export type RetailerCoverageScope = 'COUNTY' | 'REGION' | 'UK';

/**
 * Determines whether a tender location falls inside a Retailer's selected operating area.
 * COUNTY and REGION scopes match only against the Retailer's selected counties or regions;
 * UK scope always matches. `coverageAreas` is used for distance estimates only (see schema)
 * and must not override the explicit coverageScope selection here.
 */
export function retailerCoversTenderLocation(
  retailer: { coverageScope: string; counties: string; regions: string; coverageAreas?: string },
  tenderLocation: string
): boolean {
  if (retailer.coverageScope === 'UK') return true;

  const normalizedLocation = tenderLocation.trim().toLowerCase();

  if (retailer.coverageScope === 'REGION') {
    const region = getRegionForPostcode(tenderLocation);
    const selectedRegions = retailer.regions.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (region && selectedRegions.includes(region.toLowerCase())) return true;
    if (selectedRegions.some((selected) => normalizedLocation.includes(selected))) return true;
    return false;
  }

  if (retailer.coverageScope === 'COUNTY') {
    const county = getCountyForPostcode(tenderLocation);
    const selectedCounties = retailer.counties.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (county && selectedCounties.includes(county.toLowerCase())) return true;
    if (selectedCounties.some((selected) => normalizedLocation.includes(selected))) return true;
    return false;
  }

  return false;
}
