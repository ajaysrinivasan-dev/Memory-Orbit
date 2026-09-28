import { useState } from 'react';
import { auth } from './firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";

const googleProvider = new GoogleAuthProvider();

const authMessage = (err) => {
  switch (err.code) {
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email. Please log in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return 'Authentication failed. Please try again.';
  }
};

function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === 'signup';

  const handleGoogleSignIn = async () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }

    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage('Password reset email sent. Check your inbox.');
    } catch (err) {
      setError(err.code === 'auth/user-not-found'
        ? 'No account was found for that email.'
        : authMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError(null);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="w-full h-screen flex items-center justify-center relative z-50 px-4">
      <div className="w-full max-w-md p-8 bg-gray-900/60 backdrop-blur-xl border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-900/20">
        <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 tracking-tighter">
          Memory Orbit
        </h1>
        <p className="text-center text-blue-200/60 mb-6 text-sm tracking-widest uppercase">
          {isSignUp ? 'Create Neural Link' : 'Initialize Neural Link'}
        </p>

        <div className="grid grid-cols-2 gap-2 p-1 mb-6 bg-black/30 border border-blue-500/10 rounded-lg">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${!isSignUp ? 'bg-blue-600 text-white' : 'text-blue-300/60 hover:text-blue-200'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${isSignUp ? 'bg-purple-600 text-white' : 'text-blue-300/60 hover:text-blue-200'}`}
          >
            Sign Up
          </button>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={busy}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all shadow-lg shadow-blue-600/30 hover:scale-[1.02] disabled:hover:scale-100"
        >
          Continue with Google
        </button>

        <div className="my-6 flex items-center justify-center">
          <span className="border-b border-blue-500/20 w-1/4"></span>
          <span className="px-4 text-blue-300/50 text-xs uppercase">or email & password</span>
          <span className="border-b border-blue-500/20 w-1/4"></span>
        </div>

        <form onSubmit={handleEmailAuth}>
          <div className="mb-4">
            <label className="block text-blue-300 text-xs font-bold mb-2 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-4 py-3 bg-gray-800/50 border border-blue-500/30 rounded-lg text-blue-100 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 placeholder-blue-500/30 transition-all"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-blue-300 text-xs font-bold mb-2 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              className="w-full px-4 py-3 bg-gray-800/50 border border-blue-500/30 rounded-lg text-blue-100 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 placeholder-blue-500/30 transition-all"
              required
              minLength={6}
            />
          </div>

          {isSignUp && (
            <div className="mb-6">
              <label className="block text-blue-300 text-xs font-bold mb-2 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-gray-800/50 border border-blue-500/30 rounded-lg text-blue-100 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 placeholder-blue-500/30 transition-all"
                required
                minLength={6}
              />
            </div>
          )}

          {!isSignUp && (
            <div className="flex justify-end mb-6">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={busy}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
              >
                Forgot password?
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 mb-4 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-xs">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 mb-4 bg-emerald-500/20 border border-emerald-500/50 rounded text-emerald-200 text-xs">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-transparent border border-blue-500 text-blue-400 hover:bg-blue-500/10 disabled:opacity-50 font-bold py-3 px-4 rounded-lg transition-all"
          >
            {busy ? 'Connecting...' : isSignUp ? 'Create Account' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;