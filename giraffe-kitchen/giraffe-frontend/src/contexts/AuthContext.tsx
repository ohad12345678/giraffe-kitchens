import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import type { User, LoginCredentials } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isHQ: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        // Decode JWT to get user info
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: parseInt(payload.sub),
          email: payload.email,
          full_name: payload.full_name || '',
          role: payload.role,
          branch_id: payload.branch_id,
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to decode token:', error);
        localStorage.removeItem('access_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authAPI.login(credentials);
      console.log('✅ Login response:', response);
      localStorage.setItem('access_token', response.access_token);
      console.log('✅ Token saved to localStorage:', response.access_token);

      // Decode JWT to get user info (simplified - in production use proper JWT decode)
      const payload = JSON.parse(atob(response.access_token.split('.')[1]));
      console.log('✅ JWT payload:', payload);

      setUser({
        id: parseInt(payload.sub),  // Convert back to number
        email: payload.email,
        full_name: payload.full_name || '',
        role: payload.role,
        branch_id: payload.branch_id,
        created_at: new Date().toISOString(),
      });
      console.log('✅ User state updated');
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  const isHQ = user?.role === 'hq';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isHQ }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
