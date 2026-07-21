import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { ThemeToggle } from '../components/ThemeToggle';
import { MessageSquare, Mail, Lock, Sparkles } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await authService.login({ email, password });
      setAuth(data.user, data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-background px-4 relative overflow-hidden transition-colors duration-300">
      
      {/* Ambient background glow mesh spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md p-8 rounded-3xl glass-panel shadow-2xl relative z-10 border border-white/10 backdrop-blur-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 flex items-center justify-center text-white mb-4 shadow-xl neon-glow">
            <MessageSquare className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground flex items-center gap-2">
            Chat World <span className="text-primary text-xs px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 font-mono">v2</span>
          </h1>
          <p className="text-muted text-sm mt-1 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Connect instantly, securely
          </p>
        </div>

        {error && (
          <div
            className="mb-6 p-4 rounded-xl bg-error/15 border border-error/30 text-error text-sm font-medium animate-in fade-in"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="block w-full pl-10 pr-4 py-3 rounded-xl border border-card-border bg-card-border/10 text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-sm focus-ring"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full pl-10 pr-4 py-3 rounded-xl border border-card-border bg-card-border/10 text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-sm focus-ring"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white font-bold text-sm hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all duration-150 shadow-lg neon-glow cursor-pointer focus-ring"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <span className="text-muted">Don't have an account? </span>
          <Link
            to="/signup"
            className="text-primary hover:underline font-semibold focus-ring rounded"
          >
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
