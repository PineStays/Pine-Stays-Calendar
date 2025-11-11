import React from 'react';
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

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  }

  if (!user) {
     return (
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

  // Active Users
  return (
    <Routes>
        {/* Redirect logged-in users away from public pages */}
        <Route path="/login" element={<Navigate to="/" />} />
        <Route path="/signup" element={<Navigate to="/" />} />

        {/* Role-based routes */}
        {user.role === 'admin' && <Route path="/admin" element={<AdminDashboard />} />}
        {user.role === 'agent' && <Route path="/calendar" element={<AgentPortal />} />}
        {user.role === 'owner' && <Route path="/owner" element={<OwnerDashboard />} />}
      
        {/* Default route based on role */}
        <Route path="/" element={
            user.role === 'admin' ? <Navigate to="/admin" /> :
            user.role === 'agent' ? <Navigate to="/calendar" /> :
            user.role === 'owner' ? <Navigate to="/owner" /> :
            <Navigate to="/unauthorized" />
        } />

        {/* Fallback for any other path */}
        <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

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