import { Alert, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

// Google Play "Prominent Disclosure and Consent" policy: every Android runtime
// location prompt must be immediately preceded by an in-app disclosure that
// says what is collected and how it is used. All location prompts in the app
// must go through this file - never call PermissionsAndroid.request for
// location directly.

const FINE = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
const COARSE = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;
const BACKGROUND = PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION;
const { GRANTED } = PermissionsAndroid.RESULTS;

const FOREGROUND_DISCLOSURE_TITLE = 'GG SFA uses your location';
const FOREGROUND_DISCLOSURE_MESSAGE =
  'GG SFA collects your device location (precise and approximate) to:\n\n' +
  '• Mark your attendance location at punch-in and punch-out\n' +
  '• Record customer and beat visits\n' +
  '• Save the GPS position of customers and leads you add\n' +
  '• Show customers near you\n\n' +
  'Your location is sent securely to your organisation\'s GG SFA account only. ' +
  'It is not sold or used for advertising.\n\n' +
  'Tap "Agree" to continue to the Android location permission.';

const BACKGROUND_DISCLOSURE_TITLE = 'Location when the app is closed';
const BACKGROUND_DISCLOSURE_MESSAGE =
  'GG SFA collects location data to enable live field tracking of your route and ' +
  'visits, even when the app is closed or not in use.\n\n' +
  '• Collected only between punch-in and punch-out\n' +
  '• Recorded every few minutes and sent securely to your organisation\n' +
  '• Stops automatically when you punch out\n\n' +
  'Tap "Agree", then choose "Allow all the time" on the next screen.';

const androidApiLevel = () => Number(Platform.Version);

// The geolocation module silently fires the raw Android permission dialog from
// getCurrentPosition / watchPosition unless told not to. Turn that off so the
// only way a location prompt appears is through the disclosure below.
if (Platform.OS === 'android') {
  Geolocation.setRNConfiguration({
    skipPermissionRequests: true,
    locationProvider: 'auto',
  });
}

const showDisclosure = (title: string, message: string) =>
  new Promise<boolean>(resolve => {
    Alert.alert(
      title,
      message,
      [
        { text: 'No thanks', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Agree', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

// Several screens ask for location on mount at the same time; share one
// in-flight request so the user sees a single disclosure + prompt.
const singleFlight = (fn: () => Promise<boolean>) => {
  let pending: Promise<boolean> | null = null;
  return () => {
    if (!pending) {
      pending = fn()
        .catch(error => {
          console.warn('Location permission error:', error);
          return false;
        })
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  };
};

export const hasForegroundLocationPermission = async () => {
  if (Platform.OS !== 'android') return true;
  const [fine, coarse] = await Promise.all([
    PermissionsAndroid.check(FINE),
    PermissionsAndroid.check(COARSE),
  ]);
  return fine || coarse;
};

export const hasBackgroundLocationPermission = async () => {
  if (Platform.OS !== 'android' || androidApiLevel() < 29) return true;
  return PermissionsAndroid.check(BACKGROUND);
};

/**
 * Foreground location. Shows the disclosure right before the system prompt;
 * no-op when already granted. Non-Android platforms resolve true (iOS uses the
 * Info.plist usage strings).
 */
export const requestForegroundLocationPermission = singleFlight(async () => {
  if (await hasForegroundLocationPermission()) return true;

  const agreed = await showDisclosure(
    FOREGROUND_DISCLOSURE_TITLE,
    FOREGROUND_DISCLOSURE_MESSAGE,
  );
  if (!agreed) return false;

  const result = await PermissionsAndroid.requestMultiple([FINE, COARSE]);
  return result[FINE] === GRANTED || result[COARSE] === GRANTED;
});

/**
 * "Allow all the time" location for punch-in tracking. Android 10+ only;
 * foreground location must already be granted.
 */
export const requestBackgroundLocationPermission = singleFlight(async () => {
  if (await hasBackgroundLocationPermission()) return true;

  const agreed = await showDisclosure(
    BACKGROUND_DISCLOSURE_TITLE,
    BACKGROUND_DISCLOSURE_MESSAGE,
  );
  if (!agreed) return false;

  return (await PermissionsAndroid.request(BACKGROUND)) === GRANTED;
});
