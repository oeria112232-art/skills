import React, { createContext, useContext, useState } from 'react';
import { User } from '@workspace/api-client-react';

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>({
    id: 1,
    name: "Ahmed Al-Rashidi",
    email: "admin@eduplatform.com",
    role: "admin",
    points: 2450,
    streak: 14,
    createdAt: new Date().toISOString()
  });

  const login = (userData: User) => setUser(userData);
  const logout = () => setUser(null);

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
