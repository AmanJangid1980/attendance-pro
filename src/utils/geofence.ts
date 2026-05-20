import {Coords, GeofenceStatus} from '../types';
import {GEOFENCE_RADIUS_METERS} from '../config/office';

const EARTH_RADIUS_M = 6371000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineMeters(a: Coords, b: Coords): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function evaluateGeofence(
  current: Coords,
  office: Coords,
  radiusMeters: number = GEOFENCE_RADIUS_METERS,
): GeofenceStatus {
  const distanceMeters = haversineMeters(current, office);
  return {
    inside: distanceMeters <= radiusMeters,
    distanceMeters,
  };
}
