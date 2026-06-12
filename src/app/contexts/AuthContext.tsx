import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { User, UserRole } from '../types';
import { loginUser, LoginResult } from '../../controllers/loginController';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = Cookies.get('user');
    const savedToken = Cookies.get('token');
    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser) as User;
        setUser(parsedUser);
      } catch {
        Cookies.remove('user');
        Cookies.remove('token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const result = await loginUser(email, password);

    if (result.success && result.user) {
      setUser(result.user);
    }

    return result;
  };

  const logout = () => {
    setUser(null);
    Cookies.remove('user');
    Cookies.remove('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function getRoleName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    marketing_lead: 'Marketing Lead',
    general_manager: 'General Manager',
    ceo: 'CEO',
    data_collector: 'Data Collector',
    quantity_surveyor: 'Quantity Surveyor',
    designer: 'Designer',
    site_engineer: 'Site Engineer',
    finance_officer: 'Finance Officer',
  };
  return roleNames[role];
}
