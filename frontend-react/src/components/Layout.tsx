import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useStore } from '../store/useStore';
import { Button } from './ui';
import Toasts from './Toasts';

const navItems = [
  { path: '/dashboard', icon: 'lucide:layout-dashboard', label: 'Dashboard' },
  { path: '/profiles', icon: 'lucide:folder', label: 'Profiles' },
  { path: '/editor', icon: 'lucide:edit', label: 'Editor' },
  { path: '/workshop', icon: 'lucide:store', label: 'Workshop' },
  { path: '/providers', icon: 'lucide:settings', label: 'Providers' },
  { path: '/filters', icon: 'lucide:filter', label: 'Filters' },
  { path: '/logs', icon: 'lucide:file-text', label: 'Logs' },
  { path: '/faq', icon: 'lucide:help-circle', label: 'FAQ' },
  { path: '/changelog', icon: 'lucide:book-open', label: 'Changelog' },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isSidebarOpen, toggleSidebar } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sidebarWidth = isSidebarOpen ? 280 : 80;

  const [isLargeScreen, setIsLargeScreen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => setIsLargeScreen(e.matches);

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
    } else {
      // @ts-ignore
      mql.addListener(onChange);
    }
    setIsLargeScreen(mql.matches);
    return () => {
      if (typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', onChange);
      } else {
        // @ts-ignore
        mql.removeListener(onChange);
      }
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Sidebar - Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col bg-gradient-to-b from-white/6 to-white/4 border-r border-white/14"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/14">
          <AnimatePresence mode="wait">
            {isSidebarOpen ? (
              <motion.div
                key="full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-1 to-accent-2 flex items-center justify-center">
                  <Icon icon="lucide:zap" className="w-5 h-5" />
                </div>
                <span className="font-bold text-lg">Latex</span>
              </motion.div>
            ) : (
              <motion.div
                key="icon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-1 to-accent-2 flex items-center justify-center mx-auto"
              >
                <Icon icon="lucide:zap" className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-accent-1/15 text-accent-1 border border-accent-1/35'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon icon={item.icon} className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence mode="wait">
                  {isSidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="font-medium text-sm whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section (user + toggle pinned) */}
        <div className="mt-auto sticky bottom-0 bg-bg-2/85 backdrop-blur-sm">
          {/* User Section */}
          <div className="p-4 border-t border-white/14">
            <div
              className={`flex items-center gap-3 p-3 rounded-xl bg-white/5 ${
                isSidebarOpen ? '' : 'justify-center'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-1 to-accent-2 flex items-center justify-center flex-shrink-0">
                <Icon icon="lucide:user" className="w-4 h-4" />
              </div>
              <AnimatePresence mode="wait">
                {isSidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex-1 min-w-0 overflow-hidden"
                  >
                    <p className="text-sm font-medium truncate">{user?.login}</p>
                    <button
                      onClick={handleLogout}
                      className="text-xs text-white/60 hover:text-red-400 transition-colors"
                    >
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Toggle Button - Inside sidebar */}
          <div className="p-4 border-t border-white/14">
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <Icon
                icon={isSidebarOpen ? 'lucide:chevron-left' : 'lucide:chevron-right'}
                className="w-4 h-4"
              />
              {isSidebarOpen && <span className="text-xs font-medium">Collapse</span>}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-bg-2/95 backdrop-blur-sm border-b border-white/14 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-1 to-accent-2 flex items-center justify-center">
            <Icon icon="lucide:zap" className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg">Latex</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5"
        >
          <Icon
            icon={isMobileMenuOpen ? 'lucide:x' : 'lucide:menu'}
            className="w-6 h-6"
          />
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-16 right-0 bottom-0 w-64 bg-bg-2 border-l border-white/14 z-50 p-4"
            >
              <nav className="space-y-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        isActive
                          ? 'bg-accent-1/15 text-accent-1 border border-accent-1/35'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon icon={item.icon} className="w-5 h-5" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-6 pt-6 border-t border-white/14">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-1 to-accent-2 flex items-center justify-center">
                    <Icon icon="lucide:user" className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.login}</p>
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full"
                >
                  <Icon icon="lucide:log-out" className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="min-h-screen">
        <div className="block lg:hidden h-16" />
        <div
          className="max-w-full overflow-x-hidden"
          style={{ paddingLeft: isLargeScreen ? sidebarWidth : 0 }}
        >
          <div className="p-4 lg:p-8">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Global notifications */}
      <Toasts />
    </div>
  );
}