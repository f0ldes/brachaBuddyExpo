import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
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
      if (firebaseUser) {
        // Check if session has expired (3 months)
        const loginTimestamp = await AsyncStorage.getItem('loginTimestamp');
        if (loginTimestamp && Date.now() - parseInt(loginTimestamp, 10) > SESSION_MAX_AGE_MS) {
          await firebaseSignOut(auth);
          await AsyncStorage.removeItem('loginTimestamp');
          setUser(null);
          setIsGuest(true);
        } else {
          if (!loginTimestamp) {
            await AsyncStorage.setItem('loginTimestamp', Date.now().toString());
          }
          setUser(firebaseUser);
          setIsGuest(false);
        }
      } else {
        setUser(null);
        setIsGuest(true);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOut = async () => {
    await AsyncStorage.removeItem('loginTimestamp');
    setIsGuest(false);
    await firebaseSignOut(auth);
  };

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
