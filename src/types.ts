export type Coords = {
  latitude: number;
  longitude: number;
};

export type LocationFix = Coords & {
  accuracy: number;
  timestamp: number;
};

export type AttendanceRecord = {
  id: string;
  checkInAt: number;
  coords: Coords;
  accuracy: number;
  distanceFromOfficeMeters: number;
  syncedAt: number | null;
};

export type GeofenceStatus = {
  inside: boolean;
  distanceMeters: number;
};
