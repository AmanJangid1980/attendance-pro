import Geolocation, {
  GeoError,
  GeoOptions,
  GeoPosition,
  GeoWatchOptions,
  PositionError,
} from 'react-native-geolocation-service';
import {Platform} from 'react-native';
import {LocationFix} from '../types';

const WATCH_OPTIONS: GeoWatchOptions = {
  accuracy: {android: 'high', ios: 'best'},
  enableHighAccuracy: true,
  distanceFilter: 5,
  interval: 3000,
  fastestInterval: 1500,
  showLocationDialog: true,
  forceRequestLocation: true,
};

const ONE_SHOT_OPTIONS: GeoOptions = {
  accuracy: {android: 'high', ios: 'best'},
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 5000,
  showLocationDialog: true,
  forceRequestLocation: true,
};

function toFix(pos: GeoPosition): LocationFix {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? 0,
    timestamp: pos.timestamp,
  };
}

export async function requestIosAuthorization(): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }
  await Geolocation.requestAuthorization('whenInUse');
}

export function watchPosition(
  onFix: (fix: LocationFix) => void,
  onError: (err: GeoError) => void,
): () => void {
  const id = Geolocation.watchPosition(
    pos => onFix(toFix(pos)),
    err => onError(err),
    WATCH_OPTIONS,
  );
  return () => Geolocation.clearWatch(id);
}

export function getCurrentFix(): Promise<LocationFix> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos => resolve(toFix(pos)),
      err => reject(err),
      ONE_SHOT_OPTIONS,
    );
  });
}

export {PositionError};
