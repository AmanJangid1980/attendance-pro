import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import {AttendanceRecord} from '../types';
import {clearRecords, loadRecords} from '../services/storage';
import {formatDistance, formatTimestamp} from '../utils/format';

export function HistoryScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      setRecords(await loadRecords());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  useEffect(() => {
    reload();
  }, [reload]);

  const handleClear = useCallback(() => {
    if (records.length === 0) {
      return;
    }
    Alert.alert('Clear history?', 'This removes all attendance records on this device.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearRecords();
          setRecords([]);
        },
      },
    ]);
  }, [records.length]);

  const renderItem = useCallback(
    ({item}: {item: AttendanceRecord}) => (
      <View style={styles.row}>
        <View style={styles.dot} />
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{formatTimestamp(item.checkInAt)}</Text>
          <Text style={styles.rowMeta}>
            {item.coords.latitude.toFixed(5)}, {item.coords.longitude.toFixed(5)}
          </Text>
          <Text style={styles.rowMeta}>
            Distance from office: {formatDistance(item.distanceFromOfficeMeters)}
            {'  '}· Accuracy: {formatDistance(item.accuracy)}
          </Text>
        </View>
      </View>
    ),
    [],
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={records}
        keyExtractor={r => r.id}
        renderItem={renderItem}
        contentContainerStyle={
          records.length === 0 ? styles.emptyContent : styles.listContent
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={reload} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No check-ins yet</Text>
            <Text style={styles.emptyMuted}>
              Once you check in from inside the office geofence, your records will
              show up here.
            </Text>
          </View>
        }
      />
      {records.length > 0 ? (
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Text style={styles.clearText}>Clear all</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9FAFB'},
  listContent: {paddingVertical: 8},
  emptyContent: {flexGrow: 1, justifyContent: 'center'},
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginTop: 6,
    marginRight: 12,
  },
  rowBody: {flex: 1},
  rowTitle: {fontSize: 15, fontWeight: '700', color: '#111827'},
  rowMeta: {fontSize: 12, color: '#6B7280', marginTop: 2},
  sep: {height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB'},
  empty: {alignItems: 'center', paddingHorizontal: 24},
  emptyTitle: {fontSize: 17, fontWeight: '700', color: '#111827'},
  emptyMuted: {marginTop: 6, fontSize: 14, color: '#6B7280', textAlign: 'center'},
  clearBtn: {
    margin: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  clearText: {color: '#EF4444', fontWeight: '700'},
});
