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
