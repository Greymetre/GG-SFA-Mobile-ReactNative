import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

type SpeechToTextModule = {
  isAvailable: () => Promise<boolean>;
  start: (locale: string) => Promise<string>;
  stop: () => Promise<boolean>;
  cancel: () => Promise<boolean>;
};

// Native code: android/.../location/SpeechToTextModule.kt and ios/FieldConnect/FieldKonnectNotifications.swift
const SpeechToText = NativeModules.SpeechToText as SpeechToTextModule | undefined;

// en-IN understands Indian accents and Hinglish and returns Latin-script text.
export const DEFAULT_SPEECH_LOCALE = 'en-IN';

const ensureMicPermission = async () => {
  if (Platform.OS !== 'android') return true; // iOS prompts from the native module
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: 'Microphone permission',
    message: 'Allow microphone access so you can speak your visit remarks.',
    buttonPositive: 'Allow',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

/**
 * Listens until the user stops speaking (Android) or stopListening() is called,
 * then resolves with the recognised text ('' when nothing was heard).
 */
export const listenForSpeech = async (locale = DEFAULT_SPEECH_LOCALE): Promise<string> => {
  if (!SpeechToText) throw new Error('Voice typing is not available in this build.');
  if (!(await ensureMicPermission())) throw new Error('Microphone permission is required.');
  return (await SpeechToText.start(locale)).trim();
};

export const stopListening = () => SpeechToText?.stop().catch(() => false);

export const cancelListening = () => SpeechToText?.cancel().catch(() => false);
