import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
// @ts-ignore - getReactNativePersistence exists in the RN bundle but not in web type definitions
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// These values are from Firebase Console > Project Settings > General > Your apps
// They are NOT secrets — Firebase security rules protect data access, not API keys.
// TODO: Replace these placeholder values with your actual Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyDvPjXXCmNDcMQDbch8PZfLdLfhdTtag1s',
  authDomain: 'bracha-buddy.firebaseapp.com',
  projectId: 'bracha-buddy',
  storageBucket: 'bracha-buddy.firebasestorage.app',
  messagingSenderId: '749460609316',
  appId: '1:749460609316:web:4e7d045b2594c744ba3bb1',
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export { auth };
export default app;
