import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { db } from '../services/databaseService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  signup: (name: string, email: string, password: string) => Promise<User | null>;
  logout: () => void;
  updateUserInContext: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    setLoading(true);
    try {
        const storedUserId = sessionStorage.getItem('pine_stays_userId');
        if (storedUserId) {
            const sessionUser = await db.getUserById(storedUserId);
            if (sessionUser) {
                setUser(sessionUser);
            }
        }
    } catch (e) {
        console.error("Session check failed", e);
        setUser(null);
        sessionStorage.removeItem('pine_stays_userId');
    } finally {
        setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    const loggedInUser = await db.getUserByEmailAndPassword(email, password);
    if (loggedInUser) {
      setUser(loggedInUser);
      sessionStorage.setItem('pine_stays_userId', loggedInUser.id);
      setLoading(false);
      return loggedInUser;
    }
    setLoading(false);
    return null;
  };
  
  const signup = async (name: string, email: string, password: string): Promise<User | null> => {
    try {
      const newUser = await db.addUser({
        name,
        email,
        password,
        role: 'agent',
        status: 'pending'
      });
      return newUser;
    } catch (error) {
      console.error("Signup failed:", error);
      return null;
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('pine_stays_userId');
  };
  
  const updateUserInContext = (updates: Partial<User>) => {
    if(user){
      setUser(prevUser => prevUser ? { ...prevUser, ...updates } : null);
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
