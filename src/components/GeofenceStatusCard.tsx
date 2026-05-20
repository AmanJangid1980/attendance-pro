import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {GeofenceStatus} from '../types';
import {formatDistance} from '../utils/format';
import {GEOFENCE_RADIUS_METERS} from '../config/office';

type Props = {
  status: GeofenceStatus | null;
  accuracyMeters: number | null;
  officeName: string;
};

export function GeofenceStatusCard({status, accuracyMeters, officeName}: Props) {
  const inside = status?.inside ?? false;
  const distance = status ? formatDistance(status.distanceMeters) : '—';
  const accuracy = accuracyMeters ? formatDistance(accuracyMeters) : '—';

  return (
    <View style={[styles.card, inside ? styles.cardInside : styles.cardOutside]}>
      <View style={styles.row}>
        <View style={[styles.dot, inside ? styles.dotInside : styles.dotOutside]} />
        <Text style={styles.title}>
          {inside ? `Inside ${officeName}` : `Outside ${officeName}`}
        </Text>
      </View>
      <Text style={styles.line}>Distance to office: {distance}</Text>
      <Text style={styles.line}>
        Geofence radius: {GEOFENCE_RADIUS_METERS} m · GPS accuracy: {accuracy}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 12,
  },
  cardInside: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  cardOutside: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dotInside: {backgroundColor: '#10B981'},
  dotOutside: {backgroundColor: '#EF4444'},
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  line: {
    fontSize: 13,
    color: '#374151',
    marginTop: 2,
  },
});
