import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api, getToken, saveToken, deleteToken, type Profile } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

type AuthContextType = {
  user: Profile | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: Profile) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const storedToken = await getToken();
        if (storedToken) {
          const profile = await api.auth.me();
          setToken(storedToken);
          setUser(profile);
          connectSocket(storedToken);
        }
      } catch {
        // Token invalid or expired
        await deleteToken();
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (newToken: string, newUser: Profile) => {
    await saveToken(newToken);
    setToken(newToken);
    setUser(newUser);
    connectSocket(newToken);
  }, []);

  const logout = useCallback(async () => {
    disconnectSocket();
    await deleteToken();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await api.auth.me();
      setUser(profile);
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
