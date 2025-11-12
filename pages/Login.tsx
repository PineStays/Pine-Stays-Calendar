
import React, { useState } from 'react';
// FIX: Use react-router-dom v6 imports (useNavigate)
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../Header';
// FIX: Use firebase v8 compat namespace for FirebaseError
import { firebase } from '../services/firebase';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // FIX: Use useNavigate instead of useHistory
  const navigate = useNavigate();
  const auth = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await auth.login(email, password);
      // App.tsx routing will handle redirection based on role and status
      // FIX: Use navigate instead of history.push
      navigate('/');
    } catch (err) {
      // FIX: Check for error code property instead of firebase.FirebaseError instance
      const error = err as any;
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            setError('Invalid email or password.');
            break;
          default:
            setError('An error occurred. Please try again.');
            break;
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
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
          
           <div className="text-center text-sm pt-6 border-t border-border">
                <p className="text-muted-foreground">
                    Don't have an agent account?{' '}
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