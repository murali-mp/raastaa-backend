/**
 * Geographic utility functions for calculating distances
 * Uses Haversine formula for accurate distance calculations
 */

const EARTH_RADIUS_KM = 6371;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 - Latitude of first point (decimal degrees)
 * @param lon1 - Longitude of first point (decimal degrees)
 * @param lat2 - Latitude of second point (decimal degrees)
 * @param lon2 - Longitude of second point (decimal degrees)
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a point is within a certain radius of another point
 * @param center - Center point coordinates
 * @param point - Point to check
 * @param radiusKm - Radius in kilometers
 * @returns true if point is within radius
 */
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusKm: number
): boolean {
  const distance = calculateDistance(
    center.latitude,
    center.longitude,
    point.latitude,
    point.longitude
  );
  return distance <= radiusKm;
}

/**
 * Calculate bounding box for efficient database filtering
 * @param latitude - Center latitude
 * @param longitude - Center longitude
 * @param radiusKm - Radius in kilometers
 * @returns Bounding box coordinates
 */
export function getBoundingBox(
  latitude: number,
  longitude: number,
  radiusKm: number
): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
} {
  // Approximate degrees per km (at equator, varies with latitude)
  const latDegreePerKm = 1 / 111.32;
  const lonDegreePerKm = 1 / (111.32 * Math.cos(toRadians(latitude)));

  const latDelta = radiusKm * latDegreePerKm;
  const lonDelta = radiusKm * lonDegreePerKm;

  return {
    minLat: latitude - latDelta,
    maxLat: latitude + latDelta,
    minLon: longitude - lonDelta,
    maxLon: longitude + lonDelta,
  };
}
