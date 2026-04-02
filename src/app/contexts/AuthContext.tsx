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
  { id: '1', username: 'marketing', password: 'demo123', name: 'Sarah Johnson', role: 'marketing_lead' },
  { id: '2', username: 'gm', password: 'demo123', name: 'John Smith', role: 'general_manager' },
  { id: '3', username: 'design_lead', password: 'demo123', name: 'Emily Chen', role: 'design_team_leader' },
  { id: '4', username: 'designer', password: 'demo123', name: 'Michael Brown', role: 'designer' },
  { id: '5', username: 'engineer', password: 'demo123', name: 'David Wilson', role: 'site_engineer' },
  { id: '6', username: 'finance', password: 'demo123', name: 'Lisa Martinez', role: 'finance_officer' },
  { id: '7', username: 'purchasing', password: 'demo123', name: 'Robert Taylor', role: 'purchasing_team' },
  { id: '8', username: 'admin', password: 'demo123', name: 'Admin User', role: 'system_administrator' },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
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
    design_team_leader: 'Design Team Leader',
    designer: 'Designer',
    site_engineer: 'Site Engineer',
    finance_officer: 'Finance Officer',
    purchasing_team: 'Purchasing Team',
    system_administrator: 'System Administrator',
  };
  return roleNames[role];
}
