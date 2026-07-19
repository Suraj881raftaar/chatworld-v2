import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { ThemeToggle } from '../components/ThemeToggle';
import { MessageSquare, Mail, Lock, User } from 'lucide-react';

export function SignupPage() {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !password) return;

    setIsLoading(true);
    setError(null);

    try {
      await authService.signup({ email, username, password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Account registration failed. Please review inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-background px-4 transition-colors duration-300">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md p-8 rounded-2xl glass-panel shadow-2xl transition-all duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground mb-3 shadow-lg">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
            Get Started
          </h1>
          <p className="text-muted text-sm mt-1">Create your Chat World account.</p>
        </div>

        {error && (
          <div
            className="mb-6 p-4 rounded-lg bg-error/15 border border-error/30 text-error text-sm font-medium"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="mb-6 p-4 rounded-lg bg-success/15 border border-success/30 text-success text-sm font-medium"
            role="alert"
          >
            Registration successful! Redirecting to login...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <User className="h-5 w-5" />
              </div>
              <input
                id="username"
                type="text"
                required
                disabled={success}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="chatmaster"
                className="block w-full pl-10 pr-4 py-3 rounded-lg border border-card-border bg-card-border/20 text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Mail className="h-5 w-5" />
              </div>
              <input
                id="email"
                type="email"
                required
                disabled={success}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="block w-full pl-10 pr-4 py-3 rounded-lg border border-card-border bg-card-border/20 text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Lock className="h-5 w-5" />
              </div>
              <input
                id="password"
                type="password"
                required
                disabled={success}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full pl-10 pr-4 py-3 rounded-lg border border-card-border bg-card-border/20 text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || success}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all duration-150 shadow-lg cursor-pointer focus-ring"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <span className="text-muted">Already have an account? </span>
          <Link
            to="/login"
            className="text-primary hover:underline font-semibold focus-ring rounded"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
