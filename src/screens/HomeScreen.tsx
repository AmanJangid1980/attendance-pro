import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, {Circle, Marker, PROVIDER_GOOGLE} from 'react-native-maps';

const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';

import {RootStackParamList} from '../navigation/RootNavigator';
import {
  GEOFENCE_RADIUS_METERS,
  OFFICE_LOCATION,
  OFFICE_NAME,
} from '../config/office';
import {evaluateGeofence} from '../utils/geofence';
import {
  PositionError,
  getCurrentFix,
  requestIosAuthorization,
  watchPosition,
} from '../services/location';
import {
  promptOpenSettings,
  requestLocationPermission,
} from '../services/permissions';
import {addRecord} from '../services/storage';
import {
  OfficeOverride,
  clearOffice,
  loadOffice,
  saveOffice,
} from '../services/officeStorage';
import {AttendanceRecord, Coords, GeofenceStatus, LocationFix} from '../types';
import {GeofenceStatusCard} from '../components/GeofenceStatusCard';
import {OfflineBanner} from '../components/OfflineBanner';
import {useNetworkStatus} from '../hooks/useNetworkStatus';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type Status =
  | {kind: 'idle'}
  | {kind: 'requesting'}
  | {kind: 'tracking'}
  | {kind: 'permission-denied'}
  | {kind: 'permission-blocked'}
  | {kind: 'gps-disabled'}
  | {kind: 'error'; message: string};

const DEFAULT_OFFICE: {coords: Coords; name: string} = {
  coords: OFFICE_LOCATION,
  name: OFFICE_NAME,
};

export function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const {isOnline} = useNetworkStatus();
  const mapRef = useRef<MapView | null>(null);
  const stopWatchRef = useRef<(() => void) | null>(null);

  const [status, setStatus] = useState<Status>({kind: 'idle'});
  const [fix, setFix] = useState<LocationFix | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [officeOverride, setOfficeOverride] = useState<OfficeOverride | null>(
    null,
  );
  const [officeLoaded, setOfficeLoaded] = useState(false);

  const office = officeOverride
    ? {coords: officeOverride.coords, name: officeOverride.name}
    : DEFAULT_OFFICE;

  useEffect(() => {
    loadOffice().then(saved => {
      if (saved) {
        setOfficeOverride(saved);
      }
      setOfficeLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!officeLoaded || officeOverride || !fix) {
      return;
    }
    const override: OfficeOverride = {
      coords: {latitude: fix.latitude, longitude: fix.longitude},
      name: 'Current location',
      setAt: Date.now(),
    };
    saveOffice(override).then(() => setOfficeOverride(override));
  }, [officeLoaded, officeOverride, fix]);

  const geofence: GeofenceStatus | null = useMemo(
    () => (fix ? evaluateGeofence(fix, office.coords) : null),
    [fix, office.coords],
  );

  const handleGeoError = useCallback((code: number, message: string) => {
    if (code === PositionError.PERMISSION_DENIED) {
      setStatus({kind: 'permission-denied'});
      return;
    }
    if (
      code === PositionError.POSITION_UNAVAILABLE ||
      code === PositionError.SETTINGS_NOT_SATISFIED ||
      code === PositionError.PLAY_SERVICE_NOT_AVAILABLE
    ) {
      setStatus({kind: 'gps-disabled'});
      return;
    }
    setStatus({kind: 'error', message});
  }, []);

  const startTracking = useCallback(async () => {
    setStatus({kind: 'requesting'});

    const result = await requestLocationPermission();
    if (result === 'blocked') {
      setStatus({kind: 'permission-blocked'});
      return;
    }
    if (result === 'denied') {
      setStatus({kind: 'permission-denied'});
      return;
    }

    if (Platform.OS === 'ios') {
      await requestIosAuthorization();
    }

    try {
      const initial = await getCurrentFix();
      setFix(initial);
      mapRef.current?.animateToRegion(
        {
          latitude: initial.latitude,
          longitude: initial.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500,
      );
    } catch (err: unknown) {
      const e = err as {code?: number; message?: string};
      handleGeoError(e.code ?? -1, e.message ?? 'Failed to get location');
      return;
    }

    stopWatchRef.current?.();
    stopWatchRef.current = watchPosition(
      next => {
        setFix(next);
        setStatus({kind: 'tracking'});
      },
      err => handleGeoError(err.code, err.message),
    );
    setStatus({kind: 'tracking'});
  }, [handleGeoError]);

  useEffect(() => {
    startTracking();
    return () => {
      stopWatchRef.current?.();
      stopWatchRef.current = null;
    };
  }, [startTracking]);

  const handleUseCurrentAsOffice = useCallback(async () => {
    if (!fix) {
      return;
    }
    const override: OfficeOverride = {
      coords: {latitude: fix.latitude, longitude: fix.longitude},
      name: 'Current location',
      setAt: Date.now(),
    };
    await saveOffice(override);
    setOfficeOverride(override);
    mapRef.current?.animateToRegion(
      {
        latitude: override.coords.latitude,
        longitude: override.coords.longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      },
      400,
    );
  }, [fix]);

  const handleResetOffice = useCallback(async () => {
    Alert.alert(
      'Reset office?',
      `Switch back to the default office (${OFFICE_NAME}).`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearOffice();
            setOfficeOverride(null);
          },
        },
      ],
    );
  }, []);

  const handleCheckIn = useCallback(async () => {
    if (!fix || !geofence) {
      return;
    }
    if (!geofence.inside) {
      Alert.alert(
        'Outside geofence',
        `You must be within ${GEOFENCE_RADIUS_METERS} m of ${office.name} to check in.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      const record: AttendanceRecord = {
        id: `${fix.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
        checkInAt: Date.now(),
        coords: {latitude: fix.latitude, longitude: fix.longitude},
        accuracy: fix.accuracy,
        distanceFromOfficeMeters: geofence.distanceMeters,
        syncedAt: null,
      };
      await addRecord(record);
      Alert.alert('Checked in', 'Attendance saved on this device.');
    } catch (err) {
      Alert.alert('Could not save', String((err as Error)?.message ?? err));
    } finally {
      setSubmitting(false);
    }
  }, [fix, geofence, office.name]);

  const renderStatusBlock = () => {
    switch (status.kind) {
      case 'idle':
      case 'requesting':
        return (
          <View style={styles.centerBlock}>
            <ActivityIndicator />
            <Text style={styles.muted}>Acquiring location…</Text>
          </View>
        );
      case 'permission-denied':
        return (
          <View style={styles.centerBlock}>
            <Text style={styles.errorTitle}>Location permission denied</Text>
            <Text style={styles.muted}>
              Attendance needs your location to verify you are at the office.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={startTracking}>
              <Text style={styles.btnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        );
      case 'permission-blocked':
        return (
          <View style={styles.centerBlock}>
            <Text style={styles.errorTitle}>Permission blocked</Text>
            <Text style={styles.muted}>
              Enable location access in Settings to mark attendance.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={promptOpenSettings}>
              <Text style={styles.btnText}>Open settings</Text>
            </TouchableOpacity>
          </View>
        );
      case 'gps-disabled':
        return (
          <View style={styles.centerBlock}>
            <Text style={styles.errorTitle}>GPS unavailable</Text>
            <Text style={styles.muted}>
              Turn on Location Services / GPS, then retry.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={startTracking}>
              <Text style={styles.btnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        );
      case 'error':
        return (
          <View style={styles.centerBlock}>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.muted}>{status.message}</Text>
            <TouchableOpacity style={styles.btn} onPress={startTracking}>
              <Text style={styles.btnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        );
      case 'tracking':
        return null;
    }
  };

  const canCheckIn =
    status.kind === 'tracking' && geofence?.inside === true && !submitting;
  const canSetOffice = status.kind === 'tracking' && fix != null;

  return (
    <View style={styles.root}>
      <OfflineBanner visible={!isOnline} />

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          provider={MAP_PROVIDER}
          style={StyleSheet.absoluteFill}
          showsUserLocation
          showsMyLocationButton
          initialRegion={{
            latitude: office.coords.latitude,
            longitude: office.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}>
          <Marker coordinate={office.coords} title={office.name} />
          <Circle
            center={office.coords}
            radius={GEOFENCE_RADIUS_METERS}
            strokeColor="rgba(16,185,129,0.8)"
            fillColor="rgba(16,185,129,0.15)"
          />
        </MapView>
      </View>

      {status.kind === 'tracking' ? (
        <GeofenceStatusCard
          status={geofence}
          accuracyMeters={fix?.accuracy ?? null}
          officeName={office.name}
        />
      ) : (
        renderStatusBlock()
      )}

      <View style={styles.officeActions}>
        <TouchableOpacity
          style={[
            styles.officeBtn,
            !canSetOffice && styles.officeBtnDisabled,
          ]}
          disabled={!canSetOffice}
          onPress={handleUseCurrentAsOffice}>
          <Text style={styles.officeBtnText}>Use current location as office</Text>
        </TouchableOpacity>
        {officeOverride ? (
          <TouchableOpacity
            style={styles.officeResetBtn}
            onPress={handleResetOffice}>
            <Text style={styles.officeResetText}>Reset to default</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.checkInBtn, !canCheckIn && styles.checkInBtnDisabled]}
          disabled={!canCheckIn}
          onPress={handleCheckIn}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.checkInText}>
              {geofence?.inside ? 'Check in' : 'Move closer to check in'}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => navigation.navigate('History')}>
          <Text style={styles.historyText}>View attendance history</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9FAFB'},
  mapWrap: {flex: 1, minHeight: 240},
  centerBlock: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
  },
  muted: {marginTop: 6, color: '#6B7280', textAlign: 'center'},
  errorTitle: {fontSize: 15, fontWeight: '700', color: '#111827'},
  btn: {
    marginTop: 12,
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnText: {color: '#fff', fontWeight: '600'},
  officeActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  officeBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  officeBtnDisabled: {backgroundColor: '#9CA3AF'},
  officeBtnText: {color: '#fff', fontWeight: '600', fontSize: 13},
  officeResetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  officeResetText: {color: '#374151', fontWeight: '600', fontSize: 13},
  footer: {paddingHorizontal: 16, paddingVertical: 12},
  checkInBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkInBtnDisabled: {backgroundColor: '#9CA3AF'},
  checkInText: {color: '#fff', fontSize: 16, fontWeight: '700'},
  historyBtn: {paddingVertical: 12, alignItems: 'center'},
  historyText: {color: '#2563EB', fontWeight: '600'},
});
