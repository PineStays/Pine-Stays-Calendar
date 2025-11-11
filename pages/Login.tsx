import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../Header';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const user = await auth.login(email, password);
      if (user) {
        // App.tsx routing will handle redirection based on role and status
        navigate('/');
      } else {
        setError('Invalid email or password.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'admin' | 'agent' | 'owner') => {
    setError('');
    setLoading(true);
    
    const credentials = {
        admin: { email: 'admin@pinestays.com', password: 'password123' },
        agent: { email: 'agent@pinestays.com', password: 'password123' },
        owner: { email: 'owner@pinestays.com', password: 'password123' }
    };

    const { email, password } = credentials[role];

    try {
      const user = await auth.login(email, password);
      if (user) {
        navigate('/');
      } else {
        setError(`Quick login for ${role} failed. Please check seed data.`);
      }
    } catch (err) {
      setError('An error occurred during quick login. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans">
      <div className="absolute top-4 right-4">
          <ThemeToggle />
      </div>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary">
            Pine Stays
          </h1>
          <p className="mt-2 text-muted-foreground">
            Admin, Agent & Owner Portal
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="email">
                Email Address
              </label>
              <input
                className="w-full px-4 py-2.5 border border-input rounded-lg shadow-sm bg-background placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="password">
                Password
              </label>
              <input
                className="w-full px-4 py-2.5 border border-input rounded-lg shadow-sm bg-background placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                id="password"
                type="password"
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            
            <div>
              <button
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-colors ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                type="submit"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>
           <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card text-muted-foreground">Quick Access for Testing</span>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                    type="button"
                    onClick={() => handleQuickLogin('admin')}
                    disabled={loading}
                    className="w-full flex justify-center py-2.5 px-4 border border-input rounded-lg shadow-sm text-sm font-medium text-secondary-foreground bg-secondary hover:bg-accent disabled:opacity-60"
                >
                    Admin
                </button>
                <button
                    type="button"
                    onClick={() => handleQuickLogin('agent')}
                    disabled={loading}
                    className="w-full flex justify-center py-2.5 px-4 border border-input rounded-lg shadow-sm text-sm font-medium text-secondary-foreground bg-secondary hover:bg-accent disabled:opacity-60"
                >
                    Agent
                </button>
                <button
                    type="button"
                    onClick={() => handleQuickLogin('owner')}
                    disabled={loading}
                    className="w-full flex justify-center py-2.5 px-4 border border-input rounded-lg shadow-sm text-sm font-medium text-secondary-foreground bg-secondary hover:bg-accent disabled:opacity-60"
                >
                    Owner
                </button>
            </div>
           <div className="text-center text-sm mt-6">
                <p className="text-muted-foreground">
                    Agent?{' '}
                    <Link to="/signup" className="font-medium text-primary hover:text-primary/90">
                        Create an account
                    </Link>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;