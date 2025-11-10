import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@pinestays.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // In this simplified version, only the password matters. Email is for show.
    if (email.toLowerCase() !== 'admin@pinestays.com') {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }
    
    try {
      const success = await auth.login(password);
      if (success) {
        navigate('/admin');
      } else {
        setError('Invalid email or password.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-brand-600">
            Pine Stays
          </h1>
          <p className="mt-2 text-slate-500">
            Admin & Agent Portal
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
                Email Address
              </label>
              <input
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                id="email"
                type="email"
                placeholder="admin@pinestays.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
                Password
              </label>
              <input
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="bg-slate-50 p-3 rounded-lg text-center text-xs text-slate-500 border border-slate-200">
              <p><strong>Demo Credentials:</strong></p>
              <p>Email: <strong>admin@pinestays.com</strong> | Password: <strong>password123</strong></p>
            </div>
            <div>
              <button
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition duration-150 ease-in-out ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                type="submit"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;