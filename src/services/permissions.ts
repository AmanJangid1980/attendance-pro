import {Platform, PermissionsAndroid, Linking, Alert} from 'react-native';

export type PermissionResult = 'granted' | 'denied' | 'blocked';

export async function requestLocationPermission(): Promise<PermissionResult> {
  if (Platform.OS === 'ios') {
    // iOS permission is requested by react-native-geolocation-service on first
    // getCurrentPosition / watchPosition call via requestAuthorization.
    return 'granted';
  }

  try {
    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location permission',
        message:
          'Attendance needs your location to verify you are at the office.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    if (status === PermissionsAndroid.RESULTS.GRANTED) {
      return 'granted';
    }
    if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      return 'blocked';
    }
    return 'denied';
  } catch {
    return 'denied';
  }
}

export function promptOpenSettings() {
  Alert.alert(
    'Location permission required',
    'Enable location access in Settings to mark attendance.',
    [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Open settings', onPress: () => Linking.openSettings()},
    ],
  );
}
