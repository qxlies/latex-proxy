import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { Button, Input, Card } from '../components/ui';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/utils';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { setUser, setToken, setProfiles, setSelectedProfileId } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = isLogin
        ? await api.login(username, password)
        : await api.register(username, password);

      setToken(response.token);

      let fullUser = response.user;
      try {
        const { user } = await api.getUser();
        fullUser = user;
        setUser(user);
      } catch {
        setUser(response.user);
      }

      try {
        const { profiles } = await api.getProfiles();
        setProfiles(profiles);
        if (profiles.length > 0) {
          const activeId =
            (fullUser && fullUser.activeProfileId && profiles.some(p => p._id === fullUser.activeProfileId))
              ? fullUser.activeProfileId
              : profiles[0]._id;
          setSelectedProfileId(activeId);
        }
      } catch {}

      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-block mb-4"
          >
            <div className="badge badge-primary text-xs uppercase tracking-wider">
              Condom for Prompts
            </div>
          </motion.div>
          <h1 className="text-4xl font-bold text-gradient mb-2">
            Latex Proxy
          </h1>
          <p className="text-white/60">
            Formatting your prompts before they go in
          </p>
        </div>

        {/* Auth Card */}
        <Card>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-sm text-white/60">
              {isLogin
                ? 'Enter your credentials to continue'
                : 'Sign up to get started'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <Input
              label="Username"
              type="text"
              id="auth_username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoComplete="username"
              readOnly={false}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
            />

            <Input
              label="Password"
              type="password"
              id="auth_password"
              name={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              readOnly={false}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:alert-circle" className="w-4 h-4" />
                  {error}
                </div>
              </motion.div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
            >
              {isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm text-accent-1 hover:text-accent-2 transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-white/40">
          <p>
            By continuing, you agree to our{' '}
            <a href="#" className="text-accent-1 hover:underline">
              Terms of Service
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}