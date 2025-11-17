import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../Header';
import { db } from '../services/databaseService';

// --- ICONS ---
const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.31,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);


const LoginPage: React.FC = () => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);
  
  const navigate = useNavigate();
  const auth = useAuth();

  const isGoogleSignInSupported = useMemo(() => 
    ['http:', 'https:'].includes(window.location.protocol), 
  []);
  
  useEffect(() => {
    if (view === 'signup') {
      const checkUsers = async () => {
        const hasUsers = await db.hasUsers();
        setIsFirstUser(!hasUsers);
      };
      checkUsers();
    }
  }, [view]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.login(email, password);
      navigate('/');
    } catch (err: any) {
      if (err.code) {
        switch (err.code) {
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
    }
    setError('');
    setLoading(true);
    try {
      await auth.signup(name, email, password);
      // FIX: Updated success message to be more informative.
      setMessage("Registration successful! Your account is now pending approval. You may now log in.");
      setView('login');
    } catch (err: any) {
      if (err.code) {
        switch (err.code) {
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
  
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await auth.signInWithGoogle();
      navigate('/');
    } catch (err: any)
       {
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setMessage('');
      setLoading(true);
      try {
          await auth.sendPasswordReset(email);
          setMessage("Password reset email sent! Check your inbox.");
      } catch (err: any) {
          setError(err.message || 'Failed to send password reset email.');
      } finally {
          setLoading(false);
      }
  };

  const inputClass = "w-full border border-input rounded-xl shadow-sm px-4 py-3 text-base bg-input/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const buttonClass = `w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-semibold text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition duration-150 ease-in-out ${loading ? 'opacity-60 cursor-not-allowed' : ''}`;

  const renderContent = () => {
    switch (view) {
      case 'signup':
        return (
          <>
            <h2 className="text-3xl font-bold text-center text-foreground">Create Account</h2>
            {isFirstUser === true && (
                <div className="bg-primary/10 border-l-4 border-primary text-primary-foreground/90 p-4 my-4 rounded-r-lg text-sm" role="alert">
                  <p className="font-bold">Administrator Account Setup</p>
                  <p>This first account will have full administrator privileges.</p>
                </div>
            )}
            <form onSubmit={handleSignup} className="space-y-6">
               <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                  <input className={inputClass} type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading} className={buttonClass}>
                  {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>
            <div className="text-center text-sm mt-6">
                <p className="text-muted-foreground">
                    Already have an account?{' '}
                    <button onClick={() => { setView('login'); setError(''); }} className="font-semibold text-primary hover:text-primary/90">
                        Sign In
                    </button>
                </p>
            </div>
          </>
        );
      case 'forgot':
        return (
            <>
                <h2 className="text-3xl font-bold text-center text-foreground">Reset Password</h2>
                <p className="text-center text-muted-foreground text-sm mt-2">Enter your email to receive a password reset link.</p>
                <form onSubmit={handlePasswordReset} className="space-y-6 mt-8">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                        <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <button type="submit" disabled={loading} className={buttonClass}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>
                <div className="text-center text-sm mt-6">
                    <p className="text-muted-foreground">
                        Remembered your password?{' '}
                        <button onClick={() => { setView('login'); setError(''); }} className="font-semibold text-primary hover:text-primary/90">
                            Sign In
                        </button>
                    </p>
                </div>
            </>
        );
      case 'login':
      default:
        return (
            <>
                <h2 className="text-3xl font-bold text-center text-foreground">Welcome Back</h2>
                <form onSubmit={handleLogin} className="space-y-6 mt-8">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                        <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div>
                         <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-foreground">Password</label>
                            <button type="button" onClick={() => { setView('forgot'); setError(''); }} className="text-sm font-semibold text-primary hover:text-primary/90">
                                Forgot?
                            </button>
                        </div>
                        <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" disabled={loading} className={buttonClass}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
                
                {isGoogleSignInSupported && (
                    <>
                        <div className="my-6 flex items-center">
                            <div className="flex-grow border-t border-border/50"></div>
                            <span className="flex-shrink mx-4 text-xs uppercase text-muted-foreground">Or</span>
                            <div className="flex-grow border-t border-border/50"></div>
                        </div>
                        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-input rounded-xl shadow-sm text-base font-semibold text-foreground bg-card/80 hover:bg-muted">
                            <GoogleIcon />
                            Sign in with Google
                        </button>
                    </>
                )}
                
                <div className="text-center text-sm mt-6">
                    <p className="text-muted-foreground">
                        Don't have an account?{' '}
                        <button onClick={() => { setView('signup'); setError(''); }} className="font-semibold text-primary hover:text-primary/90">
                            Sign Up
                        </button>
                    </p>
                </div>
            </>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="absolute top-4 right-4 z-10">
            <ThemeToggle />
        </div>
        <div className="max-w-md w-full">
            <div className="text-center mb-8">
                <h1 className="text-5xl font-bold text-foreground">
                    Pine Stays
                </h1>
            </div>
            <div className="glass-ui rounded-2xl shadow-2xl p-8 sm:p-10 space-y-6">
                {error && <div className="bg-destructive/20 text-destructive-foreground text-sm font-medium p-3 rounded-lg text-center">{error}</div>}
                {message && <div className="bg-primary/20 text-primary-foreground text-sm font-medium p-3 rounded-lg text-center">{message}</div>}
                {renderContent()}
            </div>
        </div>
    </div>
  );
};

export default LoginPage;