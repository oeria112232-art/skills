import React, { createContext, useContext, useState } from 'react';
import { User, setAuthTokenGetter } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

// Register token getter at startup so that every API query includes the bearer token
setAuthTokenGetter(() => {
  return localStorage.getItem("mharat-token");
});

interface AuthContextType {
  user: User | null;
  login: (user: User, token?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
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
    <AuthContext.Provider value={{ user, login, logout }}>
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
