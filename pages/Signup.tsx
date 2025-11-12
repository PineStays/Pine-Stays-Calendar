import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../Header';
import { firebase } from '../services/firebase';
import { db } from '../services/databaseService';


const SignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const auth = useAuth();
  const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUsers = async () => {
      // Check if there are any users to determine if this will be the admin account.
      const hasUsers = await db.hasUsers();
      setIsFirstUser(!hasUsers);
    };
    checkUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
    }
    setError('');
    setLoading(true);
    
    try {
      await auth.signup(name, email, password);
      setSuccess(true);
    } catch (err) {
      // FIX: Check for error code property instead of firebase.FirebaseError instance
      const error = err as any;
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            setError('An account with this email already exists.');
            break;
          case 'auth/weak-password':
            setError('Password is too weak. Please use at least 6 characters.');
            break;
          case 'auth/invalid-email':
            setError('Please enter a valid email address.');
            break;
          default:
            setError('An error occurred during signup. Please try again.');
            break;
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans">
            <div className="max-w-md w-full text-center bg-card p-8 rounded-2xl shadow-xl border border-border">
                 <h1 className="text-2xl font-bold text-primary mb-4">Registration Successful!</h1>
                 <p className="text-muted-foreground mb-6">Your account has been created. If you are not the first user, your account is now awaiting approval from an administrator.</p>
                 <Link to="/login" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90">
                    Proceed to Login
                </Link>
            </div>
        </div>
    )
  }

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
            Account Registration
          </p>
        </div>
        <div className="bg-card rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 border border-border">
          {isFirstUser === true && (
            <div className="bg-primary/10 border-l-4 border-primary text-primary p-4 mb-2 rounded-r-lg" role="alert">
              <p className="font-bold">Administrator Account Setup</p>
              <p className="text-sm">You're the first one here! This account will have full administrator privileges.</p>
            </div>
          )}
          {isFirstUser === false && (
            <div className="bg-secondary/60 border-l-4 border-secondary-foreground text-secondary-foreground p-4 mb-2 rounded-r-lg" role="alert">
              <p className="font-bold">Agent Account Registration</p>
              <p className="text-sm">Your account will require approval from an administrator after creation.</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
             <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="name">
                Full Name
              </label>
              <input
                className="w-full px-4 py-2.5 border border-input rounded-lg shadow-sm bg-background placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
                Password (min. 6 characters)
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
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition duration-150 ease-in-out ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                type="submit"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
           <div className="text-center text-sm">
                <p className="text-muted-foreground">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-primary hover:text-primary/90">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;