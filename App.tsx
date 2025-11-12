
import React, { useEffect } from 'react';
// FIX: Use react-router-dom v6 imports (Routes, Navigate instead of Switch, Redirect)
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './Theme';
import AdminDashboard from './pages/AdminDashboard';
import AgentPortal from './pages/AgentPortal';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import PendingApprovalPage from './pages/PendingApproval';
import UnauthorizedPage from './pages/Unauthorized';
import OwnerDashboard from './pages/OwnerDashboard';
import { db } from './services/databaseService';

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    // This will check if the database is empty and seed it if needed.
    // The check is implemented inside the database service constructor.
    // We just need to ensure the service is initialized.
    const _ = db; 
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      // FIX: Use Routes instead of Switch, and element prop instead of component
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  if (user.status === 'pending') {
    return (
      <Routes>
        <Route path="/pending-approval" element={<PendingApprovalPage />} />
        <Route path="*" element={<Navigate to="/pending-approval" />} />
      </Routes>
    );
  }

  if (user.status === 'inactive') {
    return (
      <Routes>
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<Navigate to="/unauthorized" />} />
      </Routes>
    );
  }

  // User is authenticated and active, route based on role
  return (
    <Routes>
      {user.role === 'admin' && <Route path="/admin" element={<AdminDashboard />} />}
      {user.role === 'agent' && <Route path="/calendar" element={<AgentPortal />} />}
      {user.role === 'owner' && <Route path="/owner" element={<OwnerDashboard />} />}
      
      {/* Redirect any other paths to the user's default route */}
      <Route path="*" element={
        <Navigate to={
          user.role === 'admin' ? '/admin'
        : user.role === 'agent' ? '/calendar'
        : user.role === 'owner' ? '/owner'
        : '/unauthorized'
      } />
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="pine_stays_theme">
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;