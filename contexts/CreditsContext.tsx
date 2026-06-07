import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { getCredits } from '../utils/apiClient';
import { useAuth } from './AuthContext';

interface CreditsContextType {
  credits: number;
  lifetime: boolean;
  loading: boolean;
  /** Re-fetch the balance from the backend (after a scan, ad, or purchase). */
  refresh: () => Promise<void>;
  /** Optimistically set the balance from a response we already have. */
  setCredits: (credits: number, lifetime?: boolean) => void;
}

const CreditsContext = createContext<CreditsContextType>({
  credits: 0,
  lifetime: false,
  loading: true,
  refresh: async () => {},
  setCredits: () => {},
});

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [credits, setCreditsState] = useState(0);
  const [lifetime, setLifetime] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const info = await getCredits();
      setCreditsState(info.credits);
      setLifetime(info.lifetime);
    } catch (e) {
      console.error('Failed to refresh credits', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const setCredits = useCallback((next: number, nextLifetime?: boolean) => {
    setCreditsState(next);
    if (typeof nextLifetime === 'boolean') setLifetime(nextLifetime);
  }, []);

  // Refresh whenever the signed-in user changes (incl. anon → real upgrade).
  useEffect(() => {
    setLoading(true);
    refresh();
  }, [user?.uid, refresh]);

  return (
    <CreditsContext.Provider
      value={{ credits, lifetime, loading, refresh, setCredits }}>
      {children}
    </CreditsContext.Provider>
  );
}

export const useCredits = () => useContext(CreditsContext);
