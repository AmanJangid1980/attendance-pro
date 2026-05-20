import AsyncStorage from '@react-native-async-storage/async-storage';
import {AttendanceRecord} from '../types';

const KEY = '@attendance/records/v1';

export async function loadRecords(): Promise<AttendanceRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as AttendanceRecord[];
  } catch {
    return [];
  }
}

export async function saveRecords(records: AttendanceRecord[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(records));
}

export async function addRecord(
  record: AttendanceRecord,
): Promise<AttendanceRecord[]> {
  const existing = await loadRecords();
  const next = [record, ...existing];
  await saveRecords(next);
  return next;
}

export async function clearRecords(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
