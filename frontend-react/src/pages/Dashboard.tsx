import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input } from '../components/ui';
import { useStore } from '../store/useStore';
import { maskApiKey, copyToClipboard } from '../lib/utils';
import { api } from '../lib/api';

export function DashboardPage() {
  const { user, profiles, getCurrentProfile } = useStore();
  const [copied, setCopied] = useState<'endpoint' | 'apikey' | null>(null);
  const currentProfile = getCurrentProfile();

  const endpoint = `${window.location.origin}/v1/chat/completions`;

  const [passwordData, setPasswordData] = useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleCopy = async (text: string, type: 'endpoint' | 'apikey') => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError("New passwords don't match");
        return;
    }

    if (passwordData.newPassword.length < 6) {
        setPasswordError("Password must be at least 6 characters");
        return;
    }

    setIsChangingPassword(true);
    try {
        await api.updatePassword(passwordData.currentPassword, passwordData.newPassword);
        setPasswordSuccess('Password updated successfully');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
        setPasswordError(err.message || 'Failed to update password');
    } finally {
        setIsChangingPassword(false);
    }
  }

  const stats = [
    {
      label: 'Total Profiles',
      value: profiles.length,
      icon: 'lucide:folder',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Active Tabs',
      value: currentProfile?.tabs.filter((t) => t.enabled).length || 0,
      icon: 'lucide:layers',
      color: 'from-purple-500 to-pink-500',
    },
    {
      label: 'Total Tabs',
      value: currentProfile?.tabs.length || 0,
      icon: 'lucide:file-text',
      color: 'from-green-500 to-emerald-500',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-white/60">
          Welcome back, {user?.login}! Here's your proxy overview.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -mr-16 -mt-16`} />
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon icon={stat.icon} className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-white/60">{stat.label}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* API Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              Use these credentials to connect your applications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Endpoint */}
            <div>
              <label className="block text-xs text-white/60 mb-2 font-medium">
                Endpoint URL
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-white/5 border border-white/14 rounded-xl px-4 py-3 font-mono text-sm overflow-x-auto custom-scrollbar">
                  {endpoint}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(endpoint, 'endpoint')}
                  className="flex-shrink-0"
                >
                  <Icon
                    icon={copied === 'endpoint' ? 'lucide:check' : 'lucide:copy'}
                    className="w-4 h-4"
                  />
                </Button>
              </div>
            </div>

            {/* API Key */}
            {user?.apiKey && (
              <div>
                <label className="block text-xs text-white/60 mb-2 font-medium">
                  Your API Key
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/5 border border-white/14 rounded-xl px-4 py-3 font-mono text-sm overflow-x-auto custom-scrollbar">
                    {maskApiKey(user.apiKey)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(user.apiKey, 'apikey')}
                    className="flex-shrink-0"
                  >
                    <Icon
                      icon={copied === 'apikey' ? 'lucide:check' : 'lucide:copy'}
                      className="w-4 h-4"
                    />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Current Profile */}
      {currentProfile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Profile</CardTitle>
                  <CardDescription>
                    {currentProfile.name}
                  </CardDescription>
                </div>
                <Link to="/profiles">
                  <Button variant="ghost" size="sm">
                    <Icon icon="lucide:settings" className="w-4 h-4" />
                    Manage
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-white/60 mb-1">Provider</p>
                  <div className="flex items-center gap-2">
                    <Icon
                      icon={
                        currentProfile.providerType === 'gorouter'
                          ? 'lucide:route'
                          : currentProfile.providerType === 'openrouter'
                          ? 'lucide:globe'
                          : currentProfile.providerType === 'aistudio'
                          ? 'lucide:git-pull-request-arrow'
                          : 'lucide:settings-2'
                      }
                      className="w-4 h-4 text-accent-1"
                    />
                    <span className="font-medium capitalize">
                      {currentProfile.providerType}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-white/60 mb-1">Model</p>
                  <p className="font-medium font-mono text-sm">
                    {currentProfile.model || 'Not set'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to get you started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link to="/editor">
                <Button variant="ghost" className="w-full justify-start">
                  <Icon icon="lucide:edit" className="w-4 h-4" />
                  Edit Tabs
                </Button>
              </Link>
              <Link to="/providers">
                <Button variant="ghost" className="w-full justify-start">
                  <Icon icon="lucide:settings" className="w-4 h-4" />
                  Configure API
                </Button>
              </Link>
              <Link to="/profiles">
                <Button variant="ghost" className="w-full justify-start">
                  <Icon icon="lucide:folder-plus" className="w-4 h-4" />
                  New Profile
                </Button>
              </Link>
              <Link to="/logs">
                <Button variant="ghost" className="w-full justify-start">
                  <Icon icon="lucide:file-text" className="w-4 h-4" />
                  View Logs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Security Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
          <Card>
              <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Change your account password</CardDescription>
              </CardHeader>
              <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                      <Input
                          label="Current Password"
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                          required
                      />
                      <Input
                          label="New Password"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                          required
                      />
                      <Input
                          label="Confirm New Password"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                          required
                      />
                      
                      {passwordError && (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                              <Icon icon="lucide:alert-circle" className="w-4 h-4" />
                              {passwordError}
                          </div>
                      )}

                      {passwordSuccess && (
                          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
                              <Icon icon="lucide:check-circle" className="w-4 h-4" />
                              {passwordSuccess}
                          </div>
                      )}

                      <Button 
                          type="submit" 
                          isLoading={isChangingPassword}
                      >
                          Update Password
                      </Button>
                  </form>
              </CardContent>
          </Card>
      </motion.div>
    </div>
  );
}