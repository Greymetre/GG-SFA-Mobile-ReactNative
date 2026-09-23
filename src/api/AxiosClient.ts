import axios from 'axios';
import Toast from 'react-native-toast-message';
import store from '../components/redux/Store';
import { logout, setToken, setUser } from '../components/redux/slice/AuthSlice';
import { navigationRef } from '../services/NavigationService';
import { attachAxiosLogging } from './ApiLogger';
export const BASE_URL = 'https://gajragears.fieldkonnect.io/';
export const IMAGE_BASE_URL = 'https://gajra-gear2.s3.ap-south-1.amazonaws.com/';
// export const BASE_URL = 'http://127.0.0.1:8000/';

/**
 * API media fields are not consistent: newer endpoints return complete URLs,
 * while older endpoints return a relative path. Never add a
 * base URL to an already absolute URL (that produces an invalid image URL).
 *
 * A relative path can live in two places: older uploads are on S3, newer ones
 * (after the backend moved off S3) are on the server's public storage disk.
 * Candidates are returned in the order they should be tried.
 */
export const resolveMediaUrlCandidates = (value?: string | null): string[] => {
  const path = String(value || '').trim();

  if (!path) return [];
  if (/^https?:\/\//i.test(path)) return [path];
  if (path.startsWith('//')) return [`https:${path}`];

  // Strip any legacy Laravel public/storage prefix the API may still return.
  const normalizedPath = path
    .replace(/^\/+/, '')
    .replace(/^public\//, '')
    .replace(/^storage\//, '');

  // The site is served from the Laravel project root, so the storage link lives under /public/storage
  // Older records may live under public/uploads (legacy fileupload) or directly under the site root.
  return [
    `${IMAGE_BASE_URL}${normalizedPath}`,
    `${BASE_URL}public/storage/${normalizedPath}`,
    `${BASE_URL}public/uploads/${normalizedPath}`,
    `${BASE_URL}${normalizedPath}`,
  ];
};

export const resolveMediaUrl = (value?: string | null): string =>
  resolveMediaUrlCandidates(value)[0] || '';

// First candidate URL that actually exists (for viewers that cannot retry on error)
export const resolveWorkingMediaUrl = async (value?: string | null): Promise<string> => {
  const candidates = resolveMediaUrlCandidates(value);
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) return url;
    } catch (e) {
      // try the next location
    }
  }
  return candidates[0] || '';
};

const axiosClient = axios.create({ baseURL: BASE_URL });
attachAxiosLogging(axiosClient, 'axiosClient');

axiosClient.interceptors.request.use(async config => {
  const token = store.getState()?.auth?.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

axiosClient.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message;
    const errorMsg = error?.response?.data?.error;
    const authErrorText = `${message || ''} ${errorMsg || ''}`.toLowerCase();
    const isAuthenticationError =
      status === 401 ||
      authErrorText.includes('unauthenticated') ||
      authErrorText.includes('token expired') ||
      authErrorText.includes('invalid token');

    if (isAuthenticationError) {

      Toast.show({
        type: 'error',
        text1: 'Session expired. Please login again',
      });
      store.dispatch(setUser(null));
      store.dispatch(setToken(null));
      store.dispatch(logout());

      // ✅ navigate to login
      navigationRef.current?.reset({
        index: 0,
        routes: [{ name: 'LoginScreen' }],
      });

      return Promise.reject(error);
    }
    if (error?.response?.status === 400) {
      Toast.show({
        type: 'error',
        text1: error?.response?.data?.message || error?.response?.data?.reminders[0]?.message || error?.response?.data ||
          error?.response?.data?.errorMessage ||
          error?.response?.data?.message ||
          error?.response?.data?.errors[0]?.error || 'Something went wrong',
        visibilityTime: 5000
      });

      return error?.response?.data?.message || error?.response?.data?.error;
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
