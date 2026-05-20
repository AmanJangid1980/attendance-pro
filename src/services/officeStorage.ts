import AsyncStorage from '@react-native-async-storage/async-storage';
import {Coords} from '../types';

const KEY = '@attendance/office/v1';

export type OfficeOverride = {
  coords: Coords;
  name: string;
  setAt: number;
};

export async function loadOffice(): Promise<OfficeOverride | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as OfficeOverride;
  } catch {
    return null;
  }
}

export async function saveOffice(override: OfficeOverride): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(override));
}

export async function clearOffice(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
