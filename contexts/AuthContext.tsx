import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  User,
  signOut as firebaseSignOut,
  signInAnonymously,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  /** The Firebase user. After launch this is ALWAYS set — guests are signed
   *  in anonymously, so `user` is only null during the brief boot window. */
  user: User | null;
  /** True when the current user is an anonymous guest (not a real account). */
  isGuest: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isGuest: false,
  loading: true,
  signOut: async () => {},
  continueAsGuest: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  const SESSION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 3 months

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // No user at all → create an anonymous guest so every user has a uid +
      // token. The credit system relies on this: a tokenless request hits the
      // backend's legacy ungated path and can't be limited. onAuthStateChanged
      // fires again with the new anonymous user.
      if (!firebaseUser) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error('Anonymous sign-in failed', e);
          setUser(null);
          setIsGuest(true);
          setLoading(false);
        }
        return;
      }

      // Session expiry only applies to real accounts; anonymous guests persist.
      if (!firebaseUser.isAnonymous) {
        const loginTimestamp = await AsyncStorage.getItem('loginTimestamp');
        if (
          loginTimestamp &&
          Date.now() - parseInt(loginTimestamp, 10) > SESSION_MAX_AGE_MS
        ) {
          await firebaseSignOut(auth);
          await AsyncStorage.removeItem('loginTimestamp');
          return; // fires again → null → anonymous guest
        }
        if (!loginTimestamp) {
          await AsyncStorage.setItem('loginTimestamp', Date.now().toString());
        }
      }

      setUser(firebaseUser);
      setIsGuest(firebaseUser.isAnonymous);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOut = async () => {
    await AsyncStorage.removeItem('loginTimestamp');
    // Signing out drops back to a fresh anonymous guest (onAuthStateChanged
    // fires null → signInAnonymously).
    await firebaseSignOut(auth);
  };

  // Retained for backward compatibility; guests are now created automatically.
  const continueAsGuest = () => {
    setIsGuest(true);
  };

  return (
    <AuthContext.Provider value={{ user, isGuest, loading, signOut, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
