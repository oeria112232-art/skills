import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, setAuthTokenGetter } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

// Register token getter at startup so that every API query includes the bearer token
setAuthTokenGetter(() => {
  return localStorage.getItem("mharat-token");
});

interface AuthContextType {
  user: User | null;
  isVerifying: boolean;
  login: (user: User, token?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isVerifying, setIsVerifying] = useState(true);
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("mharat-user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved user:", e);
      }
    }
    return null;
  });

  // Track if we already verified this session to avoid duplicate calls
  const verifiedRef = useRef(false);

  // On mount: verify that the stored token is still valid against the server.
  // If the token has expired or the server was restarted with a new key,
  // we clear the session so the user is directed to login again.
  useEffect(() => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    const token = localStorage.getItem("mharat-token");
    if (!token) {
      setIsVerifying(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
          // Token is valid — refresh user data from server
          const freshUser = await res.json();
          setUser(freshUser);
          localStorage.setItem("mharat-user", JSON.stringify(freshUser));
        } else {
          // Token is invalid/expired — clear session silently
          setUser(null);
          localStorage.removeItem("mharat-user");
          localStorage.removeItem("mharat-token");
          queryClient.clear();
        }
      } catch {
        // Network error — keep the cached user so the UI doesn't flicker
        // when the server is temporarily unavailable
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, []);

  const login = (userData: User, token?: string) => {
    setUser(userData);
    localStorage.setItem("mharat-user", JSON.stringify(userData));
    if (token) {
      localStorage.setItem("mharat-token", token);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("mharat-user");
    localStorage.removeItem("mharat-token");
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isVerifying, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
