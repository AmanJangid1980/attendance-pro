# Attendance — React Native CLI

Geolocation tracking + geofence-based attendance system, built on React Native CLI (bare workflow, **not** Expo).

## What's implemented

- **Real-time location tracking** via `react-native-geolocation-service` (`watchPosition`, high-accuracy, 5 m distance filter).
- **Map integration** via `react-native-maps` with **Google Maps provider** on both iOS and Android. Shows live user location, the office marker, and the geofence circle.
- **Geofence**: fixed office at `12.9716, 77.5946` (Bengaluru) with a 100 m radius — edit `src/config/office.ts`.
- **Attendance check-in** is blocked unless the current fix is inside the geofence (Haversine distance check).
- **Local storage** via `@react-native-async-storage/async-storage` (key `@attendance/records/v1`).
- **History screen** with pull-to-refresh and a clear-all action.
- **Edge cases handled**:
  - Permission denied / blocked → action button to retry or open Settings.
  - GPS disabled / settings-not-satisfied → retry button.
  - Offline → top banner; app still saves locally (no network is required to mark attendance).

## Project layout

```
src/
  App.tsx
  navigation/RootNavigator.tsx
  screens/
    HomeScreen.tsx      # map + check-in
    HistoryScreen.tsx   # list of records
  services/
    location.ts         # watchPosition / getCurrentPosition wrappers
    permissions.ts      # Android runtime permission flow
    storage.ts          # AsyncStorage CRUD for records
  hooks/useNetworkStatus.ts
  components/
    GeofenceStatusCard.tsx
    OfflineBanner.tsx
  utils/
    geofence.ts         # haversine + evaluateGeofence()
    format.ts
  config/office.ts      # OFFICE_LOCATION, GEOFENCE_RADIUS_METERS
  types.ts

android/                # Gradle config, AndroidManifest, Main{Activity,Application}.kt
ios/                    # Podfile, Info.plist, AppDelegate.{h,mm}, main.m
```

## Setup

### 1. Install JS deps

```bash
npm install
# or: yarn install
```

### 2. Generate the bits not checked in

A few native artifacts are **binary or UUID-fragile** and cannot be hand-written reliably. Regenerate them once by running the RN init in a temp dir and copying the missing files in:

```bash
# from a temp directory
npx @react-native-community/cli@15 init AttendanceAppTmp --version 0.76.5 --skip-install

# Copy these into your project:
cp -R AttendanceAppTmp/android/gradlew AttendanceAppTmp/android/gradlew.bat android/
cp    AttendanceAppTmp/android/gradle/wrapper/gradle-wrapper.jar android/gradle/wrapper/
cp -R AttendanceAppTmp/android/app/src/main/res/mipmap-* android/app/src/main/res/
cp    AttendanceAppTmp/android/app/debug.keystore android/app/
cp -R AttendanceAppTmp/ios/AttendanceApp.xcodeproj ios/
cp -R AttendanceAppTmp/ios/AttendanceAppTests ios/
```

> If you have `@react-native-community/cli` available locally, you can also just run `npx react-native init AttendanceApp --template react-native@0.76.5` in a sibling folder and copy `android/gradlew*`, `android/gradle/wrapper/gradle-wrapper.jar`, the `mipmap-*` icon folders, and the `*.xcodeproj/` package over.

### 3. Google Maps API keys

The map provider is set to `PROVIDER_GOOGLE` on both platforms, so you need keys.

**Android**: open `android/gradle.properties` and replace
```
GOOGLE_MAPS_API_KEY=YOUR_ANDROID_GOOGLE_MAPS_API_KEY
```
with your actual key. It is wired into `AndroidManifest.xml` via a string resource (`app/build.gradle` sets `resValue "string", "google_maps_api_key", ...`).

**iOS**: open `ios/AttendanceApp/AppDelegate.mm` and replace
```
[GMSServices provideAPIKey:@"YOUR_IOS_GOOGLE_MAPS_API_KEY"];
```

### 4. iOS pods

```bash
cd ios && pod install && cd ..
```

### 5. Run

```bash
npm run start          # Metro
npm run android        # in a second terminal
npm run ios            # in a second terminal
```

## Editing the office location

`src/config/office.ts`:
```ts
export const OFFICE_LOCATION = { latitude: 12.9716, longitude: 77.5946 };
export const OFFICE_NAME = 'HQ Bengaluru';
export const GEOFENCE_RADIUS_METERS = 100;
```

## Edge case behavior

| Scenario                           | Behavior |
|------------------------------------|----------|
| First launch, no permission        | Android prompt fires immediately. iOS uses `Geolocation.requestAuthorization('whenInUse')`. |
| Permission denied (this run)       | "Try again" button re-requests. |
| Permission blocked ("Don't ask")   | "Open settings" button via `Linking.openSettings()`. |
| GPS off / settings-not-satisfied   | `react-native-geolocation-service` triggers Google's location settings dialog (`showLocationDialog`, `forceRequestLocation`). On failure, a retry button is shown. |
| Offline (no network)               | Yellow banner. Check-in still works — records are written to AsyncStorage. |
| Check-in attempted outside fence   | Button is disabled and labelled "Move closer to check in"; tapping shows an alert if pressed via accessibility. |

## Testing the geofence quickly

Use the simulator's location simulation to drop a custom coordinate near the office:

- **iOS Simulator**: Features → Location → Custom Location → `12.9716, 77.5946` (inside) or `12.9800, 77.6100` (outside).
- **Android Emulator**: extended controls (⋮) → Location → set lat/lng.

## Notes

- New Architecture is **enabled** (`newArchEnabled=true`, `fabricEnabled` in `MainActivity.kt`). If you hit a third-party library compatibility issue, flip `newArchEnabled=false` in `android/gradle.properties` and `RCT_NEW_ARCH_ENABLED=0` for iOS pod install.
- Hermes is on by default.
- The records schema (`AttendanceRecord` in `src/types.ts`) includes a `syncedAt: number | null` field — currently unused but in place for a future "sync to server" flow.
