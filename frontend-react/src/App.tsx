import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthPage } from './pages/Auth';
import { DashboardPage } from './pages/Dashboard';
import { ProfilesPage } from './pages/Profiles';
import { EditorPage } from './pages/Editor';
import { ProvidersPage } from './pages/Providers';
import { LogsPage } from './pages/Logs';
import { ContentFiltersPage } from './pages/ContentFilters';
import { Layout } from './components/Layout';
import { Loading } from './components/ui';
import { useStore } from './store/useStore';
import { api } from './lib/api';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (!isAuthenticated && !token) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { setUser, setProfiles, setSelectedProfileId, isLoading, setIsLoading } = useStore();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initApp = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [{ user }, { profiles }] = await Promise.all([
          api.getUser(),
          api.getProfiles(),
        ]);

        setUser(user);
        setProfiles(profiles);

        if (profiles.length > 0) {
          const activeProfile = user.activeProfileId
            ? profiles.find((p) => p._id === user.activeProfileId)
            : profiles[0];
          setSelectedProfileId(activeProfile?._id || profiles[0]._id);
        }
      } catch (err) {
        console.error('Failed to initialize app:', err);
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  if (isLoading) {
    return <Loading fullscreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profiles" element={<ProfilesPage />} />
          <Route path="editor" element={<EditorPage />} />
          <Route path="providers" element={<ProvidersPage />} />
          <Route path="filters" element={<ContentFiltersPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="changelog" element={<ChangelogPage />} />
          <Route path="faq" element={<FAQPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function ChangelogPage() {
  const items = [
    { version: '1.0.0', date: '2025-11-13', notes: [
      '🎉 Initial Release',
      'Modular prompt system with tabs',
      'Support for multiple providers (GoRouter, OpenRouter, AI Studio, Custom)',
      'Profile system with Import/Export',
      'Request logging and analysis of all blocks',
      'Placeholders for dynamic data substitution'
    ]},
  ];
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Changelog</h1>
      {items.map((it) => (
        <div key={it.version} className="panel">
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-semibold">v{it.version}</div>
            <div className="text-sm text-white/60">{it.date}</div>
          </div>
          <ul className="list-disc pl-6 space-y-1 text-sm text-white/80">
            {it.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function FAQPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">FAQ</h1>

      {/* JanitorAI Quick Setup */}
      <div className="panel">
        <h3 className="text-lg font-semibold mb-2">JanitorAI: Quick Setup</h3>
        <ol className="list-decimal pl-6 space-y-2 text-sm text-white/80">
          <li>
            Copy your API Key from the Dashboard (click the copy icon near “Your API Key”).
            <div className="text-xs text-white/50 mt-1 select-all">sk-***...***</div>
          </li>
          <li>
            Go to JanitorAI → API Settings in the chat. Select “Proxy” and create a new profile.
            <div className="mt-2">
              <img src="/faq/janitor_api_settings.png" alt="JanitorAI API Settings" className="w-full max-w-xl rounded-lg border border-white/10" />
            </div>
          </li>
          <li>
            Paste the Endpoint URL:
            <code className="ml-2">https://latex.ai.bobots.me/v1/chat/completions</code>
          </li>
          <li>Paste your API Key from Latex Proxy.</li>
          <li>
            In Custom Prompt paste:
            <pre className="mt-2 p-2 bg-black/40 rounded border border-white/10 text-xs overflow-x-auto">
              {'<!user>{{user}}</user><character>{{char}}</character>'}
            </pre>
          </li>
        </ol>
      </div>

      {/* Import a Profile */}
      <div className="panel">
        <h3 className="text-lg font-semibold mb-2">Import a profile</h3>
        <ol className="list-decimal pl-6 space-y-2 text-sm text-white/80">
          <li>Return to Latex Proxy → Click “Profiles”.</li>
          <li>Select desired profile or create a new one.</li>
          <li>Click “Export” to download the profile.</li>
          <li>Click “Import” to upload a ready-made profile.</li>
          <li>Click “Set for API” to activate the profile for API use.</li>
          <li>Done! Start chatting on JanitorAI.</li>
        </ol>
      </div>

      {/* About Profiles */}
      <div className="panel">
        <h3 className="text-lg font-semibold mb-2">About Profiles & Placeholders</h3>
        <p className="text-sm text-white/80 mb-2">
          Profiles are modular system prompts composed of tabs that are sent to the model. You can create unlimited profiles,
          switch between them, and share via Import/Export.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <h4 className="font-semibold text-sm mb-1">Supported placeholders</h4>
            <ul className="list-disc pl-6 space-y-1 text-sm text-white/80">
              <li><code>{'{bot_persona}'}</code> — bot character description</li>
              <li><code>{'{scenario}'}</code> — dialogue scenario</li>
              <li><code>{'{user_persona}'}</code> — user description</li>
              <li><code>{'{summary}'}</code> — summary</li>
              <li><code>{'{example_dialogs}'}</code> — example dialogues</li>
              <li><code>{'{lorebooks}'}</code> — lorebooks</li>
              <li><code>{'{{user}}'}</code> — user name</li>
              <li><code>{'{{char}}'}</code> — character name</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Tips</h4>
            <ul className="list-disc pl-6 space-y-1 text-sm text-white/80">
              <li>Use Profiles for different tasks/characters.</li>
              <li>“Chat History” tab injects user messages in place.</li>
              <li>“Merge Consecutive Roles” merges blocks of same role to reduce tokens.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* GoRouter Promo */}
      <div className="panel">
        <h3 className="text-lg font-semibold mb-2">GoRouter: Fast and Generous</h3>
        <ul className="list-disc pl-6 space-y-1 text-sm text-white/80">
          <li>🎉 Free plan: 500,000 tokens per day</li>
          <li>🚀 Access to top models: Claude, OpenAI, Gemini and others via OpenRouter</li>
          <li>🧠 Support advanced features: reasoning toggle, provider selection</li>
          <li>💰 Affordable paid plans for higher limits</li>
        </ul>
        <a
          href="https://discord.gg/Az7pRmY9SR"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm border border-white/10"
        >
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.211.375-.444.864-.608 1.249c-1.844-.276-3.68-.276-5.486 0c-.164-.401-.405-.874-.617-1.249a.077.077 0 0 0-.079-.037a19.736 19.736 0 0 0-4.885 1.515a.07.07 0 0 0-.032.027C2.24 9.045 1.385 13.58 1.77 18.061a.084.084 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.077.077 0 0 0 .084-.027c.463-.632.875-1.3 1.226-2.005a.076.076 0 0 0-.041-.104a12.9 12.9 0 0 1-1.819-.87a.077.077 0 0 1-.008-.128c.122-.09.244-.185.361-.28a.074.074 0 0 1 .076-.01c3.815 1.742 7.93 1.742 11.698 0a.074.074 0 0 1 .078.01c.117.095.239.19.361.28a.077.077 0 0 1-.006.128c-.58.335-1.19.62-1.82.87a.076.076 0 0 0-.04.105c.36.704.772 1.373 1.226 2.005a.077.077 0 0 0 .084.027a19.876 19.876 0 0 0 6-3.03a.077.077 0 0 0 .031-.056c.5-5.177-.838-9.675-3.549-13.665a.06.06 0 0 0-.03-.027ZM8.02 15.331c-1.146 0-2.086-1.053-2.086-2.346c0-1.293.92-2.355 2.086-2.355c1.175 0 2.104 1.07 2.086 2.355c-.018 1.293-.92 2.346-2.086 2.346Zm7.975 0c-1.146 0-2.086-1.053-2.086-2.346c0-1.293.92-2.355 2.086-2.355c1.175 0 2.104 1.07 2.086 2.355c-.018 1.293-.91 2.346-2.086 2.346Z"/></svg>
          Join Discord
        </a>
      </div>
    </div>
  );
}

export default App;
