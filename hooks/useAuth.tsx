import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/databaseService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password:string) => Promise<User | null>;
  signup: (name: string, email: string, password: string) => Promise<User | null>;
  logout: () => void;
  updateUserInContext: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session storage for a logged in user
    try {
      const storedUser = sessionStorage.getItem('pine_stays_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
        console.error("Failed to parse user from sessionStorage", error);
        sessionStorage.removeItem('pine_stays_user');
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<User | null> => {
    const users = await db.getUsers();
    const foundUser = users.find(u => u.email === email && u.password === password);
    if (foundUser) {
      setUser(foundUser);
      sessionStorage.setItem('pine_stays_user', JSON.stringify(foundUser));
      return foundUser;
    }
    return null;
  };
  
  const signup = async (name: string, email: string, password: string): Promise<User | null> => {
     const users = await db.getUsers();
     if (users.some(u => u.email === email)) {
        console.error("Signup failed: email already exists");
        return null;
     }
     const newUser = await db.addUser({
        name,
        email,
        password,
        role: 'agent',
        status: 'pending'
     });
     return newUser;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('pine_stays_user');
  };
  
  const updateUserInContext = (updates: Partial<User>) => {
    if(user){
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      sessionStorage.setItem('pine_stays_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUserInContext }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
