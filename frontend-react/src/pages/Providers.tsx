import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { Card, Input } from '../components/ui';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { debounce } from '../lib/utils';
import type { ProviderType } from '../types';

const providers = [
  {
    type: 'gorouter' as ProviderType,
    icon: 'lucide:route',
    name: 'GoRouter',
    description: 'By Latex • 500k tok/day • Claude, OpenAI & more',
    badge: 'FREE PLAN',
    color: 'from-green-500 to-emerald-500',
  },
  {
    type: 'openrouter' as ProviderType,
    icon: 'lucide:globe',
    name: 'OpenRouter',
    description: 'Access 200+ AI models via OpenRouter API',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    type: 'aistudio' as ProviderType,
    icon: 'lucide:git-pull-request-arrow',
    name: 'Google AI Studio',
    description: 'Access to latest Gemini models',
    color: 'from-orange-500 to-yellow-500',
  },
  {
    type: 'custom' as ProviderType,
    icon: 'lucide:settings-2',
    name: 'Custom Proxy',
    description: 'Use your own OpenAI-compatible endpoint',
    color: 'from-purple-500 to-pink-500',
  },
];

export function ProvidersPage() {
  const { user, setUser } = useStore();
  
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('gorouter');
  const [settings, setSettings] = useState<any>({});
  const [openrouterModels, setOpenrouterModels] = useState<any[]>([]);
  const [modelSearch, setModelSearch] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const initialized = useRef(false);
  const modelsFetched = useRef(false);

  useEffect(() => {
    if (user && !initialized.current) {
      setSelectedProvider(user.globalProviderType || 'gorouter');
      setSettings(user.globalProviders || {});
      initialized.current = true;
    }
  }, [user?._id]);

  useEffect(() => {
    if (user && initialized.current) {
      setSelectedProvider(user.globalProviderType || 'gorouter');
    }
  }, [user?.globalProviderType]);

  useEffect(() => {
    modelsFetched.current = false;
  }, [selectedProvider]);

  useEffect(() => {
    if (modelsFetched.current) return;
    
    if (selectedProvider === 'openrouter') {
      fetchOpenRouterModels();
      modelsFetched.current = true;
    } else if (selectedProvider === 'gorouter') {
      fetchOpenaiModels();
      modelsFetched.current = true;
    }
  }, [selectedProvider]);

  const fetchOpenaiModels = async () => {
    try {
      const response = await fetch('https://gorouter.bobots.me/v1/models');
      const data = await response.json();
      setOpenrouterModels(data.data || [])
    } catch (err) {
      console.error('Failed to fetch models: ', err)
    }
    return Promise.resolve();
  }

  const fetchOpenRouterModels = async () => {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models');
      const data = await response.json();
      setOpenrouterModels(data.data || []);
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
    return Promise.resolve();
  };

  const saveSettings = debounce(async (updates: any) => {
    if (!user) return;
    try {
      const result = await api.updateGlobalProvider(updates);
      setUser({ ...user, ...result });
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }, 500);

  const handleProviderChange = async (type: ProviderType) => {
    setSelectedProvider(type);
    if (!user) return;

    const updates: any = { globalProviderType: type };

    await api.updateGlobalProvider(updates);
    setUser({ ...user, globalProviderType: type });
  };

  const handleSettingChange = (provider: string, field: string, value: any) => {
    const newSettings = {
      ...settings,
      [provider]: {
        ...settings[provider],
        [field]: value,
      },
    };
    setSettings(newSettings);

    const updates: any = {
      globalProviders: newSettings,
    };

    saveSettings(updates);
  };

  const filteredModels = openrouterModels.filter(
    (m) =>
      m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card className="text-center py-12">
          <Icon icon="lucide:settings-2" className="w-16 h-16 mx-auto mb-4 text-white/40" />
          <h2 className="text-xl font-semibold mb-2">Not Logged In</h2>
          <p className="text-white/60">Please log in first</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Autofill trap (prevents Chrome credential manager on API fields) */}
      <form
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] -top-[9999px] opacity-0 pointer-events-none"
      >
        <input type="text" name="username" autoComplete="username" />
        <input type="password" name="password" autoComplete="new-password" />
      </form>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">Global API Providers</h1>
        <p className="text-white/60">
          Configure your default AI model provider. These settings will be used by all profiles unless overridden.
        </p>
      </motion.div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {providers.map((prov, index) => (
          <motion.div
            key={prov.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex"
          >
            <div className="relative w-full">
              <Card
                hover
                onClick={() => handleProviderChange(prov.type)}
                className={`relative cursor-pointer transition-all w-full h-full min-h-[220px] flex flex-col ${
                  selectedProvider === prov.type
                    ? 'border-accent-1/60 bg-accent-1/10 ring-2 ring-accent-1/30 shadow-lg shadow-accent-1/20'
                    : 'hover:border-white/24 hover:bg-white/6'
                }`}
              >
                {selectedProvider === prov.type && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-accent-1/20 border border-accent-1/40 text-accent-1 text-[11px] font-semibold">
                    <Icon icon="lucide:check" className="w-3.5 h-3.5" />
                    Selected
                  </div>
                )}
                <div className="text-center flex-1 flex flex-col items-center">
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${prov.color} flex items-center justify-center`}>
                    <Icon icon={prov.icon} className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold mb-1">{prov.name}</h4>
                  {prov.badge && (
                    <span className="badge badge-success text-xs mb-2 inline-block">
                      {prov.badge}
                    </span>
                  )}
                  <p className="text-xs text-white/60 leading-relaxed mt-auto px-2">
                    {prov.description}
                  </p>
                  <div className="w-full mt-3 pt-3 border-t border-white/10 text-xs text-white/60">
                    {selectedProvider === prov.type ? 'Currently selected' : 'Click to select'}
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Provider Settings */}
      <motion.div
        key={selectedProvider}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/14">
            <Icon
              icon={providers.find((p) => p.type === selectedProvider)?.icon || 'lucide:settings'}
              className="w-6 h-6 text-accent-1"
            />
            <h3 className="text-lg font-semibold">
              {providers.find((p) => p.type === selectedProvider)?.name} Configuration
            </h3>
          </div>

          {/* GoRouter Settings */}
          {selectedProvider === 'gorouter' && (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <p className="text-sm mb-3">
                  <strong className="text-green-400">🎉 Free Plan Available!</strong>
                  <br />
                  API от разработчика Latex с бесплатным Free Plan: 500k токенов в день и доступом к моделям Claude, OpenAI и другим через OpenRouter.
                </p>
                <a
                  href="https://discord.gg/Az7pRmY9SR"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Icon icon="lucide:message-circle" className="w-4 h-4" />
                  Join Discord Server
                </a>
              </div>

              <Input
                label="API Key"
                className="masked-input"
                value={settings.gorouter?.apiKey || ''}
                onChange={(e) => handleSettingChange('gorouter', 'apiKey', e.target.value)}
                placeholder="Enter your GoRouter API key"
                autoComplete="new-password"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
              />

              <div>
                <label className="block text-xs text-white/60 mb-2 font-medium">
                  Model
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.gorouter?.model || ''}
                    onChange={(e) => {
                      handleSettingChange('gorouter', 'model', e.target.value);
                      setModelSearch(e.target.value);
                    }}
                    onFocus={() => setShowModelDropdown(true)}
                    onBlur={() => setTimeout(() => setShowModelDropdown(false), 200)}
                    placeholder="Search or type model..."
                    className="input"
                  />
                  {showModelDropdown && filteredModels.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto bg-bg-2/95 backdrop-blur-sm border border-white/14 rounded-xl shadow-2xl z-10 custom-scrollbar">
                      {filteredModels.slice(0, 50).map((model) => (
                        <div
                          key={model.id}
                          onClick={() => {
                            handleSettingChange('gorouter', 'model', model.id);
                            setShowModelDropdown(false);
                          }}
                          className="p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0"
                        >
                          <div className="font-medium text-sm">{model.name}</div>
                          <div className="text-xs text-white/60 font-mono">{model.id}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* OpenRouter Settings */}
          {selectedProvider === 'openrouter' && (
            <div className="space-y-4">
              <Input
                label="API Key"
                className="masked-input"
                value={settings.openrouter?.apiKey || ''}
                onChange={(e) => handleSettingChange('openrouter', 'apiKey', e.target.value)}
                placeholder="sk-or-v1-..."
                autoComplete="new-password"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
              />

              <div>
                <label className="block text-xs text-white/60 mb-2 font-medium">
                  Model
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.openrouter?.model || ''}
                    onChange={(e) => {
                      handleSettingChange('openrouter', 'model', e.target.value);
                      setModelSearch(e.target.value);
                    }}
                    onFocus={() => setShowModelDropdown(true)}
                    onBlur={() => setTimeout(() => setShowModelDropdown(false), 200)}
                    placeholder="Search models..."
                    className="input"
                  />
                  {showModelDropdown && filteredModels.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto bg-bg-2/95 backdrop-blur-sm border border-white/14 rounded-xl shadow-2xl z-10 custom-scrollbar">
                      {filteredModels.slice(0, 50).map((model) => (
                        <div
                          key={model.id}
                          onClick={() => {
                            handleSettingChange('openrouter', 'model', model.id);
                            setShowModelDropdown(false);
                          }}
                          className="p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0"
                        >
                          <div className="font-medium text-sm">{model.name}</div>
                          <div className="text-xs text-white/60 font-mono">{model.id}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Studio Settings */}
          {selectedProvider === 'aistudio' && (
            <div className="space-y-4">
              <Input
                label="API Key"
                className="masked-input"
                value={settings.aistudio?.apiKey || ''}
                onChange={(e) => handleSettingChange('aistudio', 'apiKey', e.target.value)}
                placeholder="Your AI Studio API key"
                autoComplete="new-password"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
              />

              <Input
                label="Model"
                value={settings.aistudio?.model || 'gemini-2.5-pro'}
                onChange={(e) => handleSettingChange('aistudio', 'model', e.target.value)}
                placeholder="gemini-2.5-pro"
              />
            </div>
          )}

          {/* Custom Settings */}
          {selectedProvider === 'custom' && (
            <div className="space-y-4">
              <Input
                label="Endpoint URL"
                value={settings.custom?.endpoint || ''}
                onChange={(e) => handleSettingChange('custom', 'endpoint', e.target.value)}
                placeholder="https://api.example.com/v1/chat/completions"
                autoComplete="off"
                inputMode="url"
                autoCorrect="off"
                spellCheck={false}
                name="custom_endpoint"
              />

              <Input
                label="API Key"
                className="masked-input"
                value={settings.custom?.apiKey || ''}
                onChange={(e) => handleSettingChange('custom', 'apiKey', e.target.value)}
                placeholder="Your API key"
                autoComplete="new-password"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
              />

              <Input
                label="Model"
                value={settings.custom?.model || ''}
                onChange={(e) => handleSettingChange('custom', 'model', e.target.value)}
                placeholder="gpt-4, claude-3, etc."
              />
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}