import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mockUsers: Array<User & { password: string }> = [
  { id: '0', username: 'ceo', password: 'demo123', name: 'Ava Reynolds', role: 'ceo' },
  { id: '1', username: 'marketing', password: 'demo123', name: 'Sarah Johnson', role: 'marketing_lead' },
  { id: '2', username: 'gm', password: 'demo123', name: 'John Smith', role: 'general_manager' },
  { id: '11', username: 'quantity', password: 'demo123', name: 'Oliver Grant', role: 'quantity_surveyor' },
  { id: '3', username: 'emily', password: 'demo123', name: 'Emily Chen', role: 'designer' },
  { id: '4', username: 'designer', password: 'demo123', name: 'Michael Brown', role: 'designer' },
  { id: '5', username: 'engineer', password: 'demo123', name: 'David Wilson', role: 'site_engineer' },
  { id: '6', username: 'finance', password: 'demo123', name: 'Lisa Martinez', role: 'finance_officer' },
  
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser) as User;
      setUser(parsedUser);
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    const foundUser = mockUsers.find(
      u => u.username === username && u.password === password
    );

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('user', JSON.stringify(userWithoutPassword));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
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
