import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session storage on initial load
    const storedAuth = sessionStorage.getItem('pine_stays_auth');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = async (password: string): Promise<boolean> => {
    setLoading(true);
    // Simple password check for demo purposes
    if (password === 'password123') {
      setIsAuthenticated(true);
      sessionStorage.setItem('pine_stays_auth', 'true');
      setLoading(false);
      return true;
    }
    setLoading(false);
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('pine_stays_auth');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout }}>
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