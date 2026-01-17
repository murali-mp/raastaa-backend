/**
 * Calculate the Haversine distance between two points on Earth
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Generate a geohash for a given latitude and longitude
 * @param lat Latitude
 * @param lng Longitude
 * @param precision Geohash precision (1-12)
 * @returns Geohash string
 */
export function getGeohash(lat: number, lng: number, precision = 6): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let hash = '';
  let isEven = true;
  let bit = 0;
  let ch = 0;

  while (hash.length < precision) {
    if (isEven) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        ch |= 1 << (4 - bit);
        minLng = mid;
      } else {
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        ch |= 1 << (4 - bit);
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }
    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      hash += base32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

/**
 * Decode a geohash to latitude and longitude
 * @param hash Geohash string
 * @returns Object with lat, lng, and error margins
 */
export function decodeGeohash(hash: string): { lat: number; lng: number; latErr: number; lngErr: number } {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let isEven = true;

  for (const char of hash.toLowerCase()) {
    const idx = base32.indexOf(char);
    if (idx === -1) continue;

    for (let bit = 4; bit >= 0; bit--) {
      const bitVal = (idx >> bit) & 1;
      if (isEven) {
        const mid = (minLng + maxLng) / 2;
        if (bitVal === 1) {
          minLng = mid;
        } else {
          maxLng = mid;
        }
      } else {
        const mid = (minLat + maxLat) / 2;
        if (bitVal === 1) {
          minLat = mid;
        } else {
          maxLat = mid;
        }
      }
      isEven = !isEven;
    }
  }

  return {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
    latErr: (maxLat - minLat) / 2,
    lngErr: (maxLng - minLng) / 2,
  };
}

/**
 * Get neighboring geohashes for a given geohash
 * @param hash Center geohash
 * @returns Array of 8 neighboring geohashes
 */
export function getNeighborGeohashes(hash: string): string[] {
  const { lat, lng, latErr, lngErr } = decodeGeohash(hash);
  const precision = hash.length;

  const neighbors: string[] = [];
  const directions = [
    [latErr * 2, 0],           // N
    [latErr * 2, lngErr * 2],  // NE
    [0, lngErr * 2],           // E
    [-latErr * 2, lngErr * 2], // SE
    [-latErr * 2, 0],          // S
    [-latErr * 2, -lngErr * 2],// SW
    [0, -lngErr * 2],          // W
    [latErr * 2, -lngErr * 2], // NW
  ];

  for (const dir of directions) {
    const dLat = dir[0] ?? 0;
    const dLng = dir[1] ?? 0;
    neighbors.push(getGeohash(lat + dLat, lng + dLng, precision));
  }

  return neighbors;
}

/**
 * Check if a point is within a bounding box
 */
export function isPointInBoundingBox(
  lat: number,
  lng: number,
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
): boolean {
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

/**
 * Get bounding box for a circle
 */
export function getBoundingBox(
  lat: number,
  lng: number,
  radiusMeters: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const R = 6371000; // Earth's radius in meters
  const latDelta = (radiusMeters / R) * (180 / Math.PI);
  const lngDelta = (radiusMeters / R) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

/**
 * Validate latitude value
 */
export function isValidLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

/**
 * Validate longitude value
 */
export function isValidLongitude(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return isValidLatitude(lat) && isValidLongitude(lng);
}
