import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { Card, Button } from '../components/ui';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import type { Log, LogPlaceholders } from '../types';

export function LogsPage() {
  const user = useStore((state) => state.user);
  const [logs, setLogs] = useState<Log[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [isLoggingEnabled, setIsLoggingEnabled] = useState(false);
  const isFetching = useRef(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (user) {
      setIsLoggingEnabled(user.isLoggingEnabled);
    }
  }, [user?.isLoggingEnabled]);

  useEffect(() => {
    if (hasInitialized.current && currentPage === 1) {
      return;
    }
    
    if (isFetching.current) {
      return;
    }
    
    isFetching.current = true;
    hasInitialized.current = true;
    
    const doFetch = async () => {
      try {
        const data = await api.getLogs(currentPage);
        setLogs(data.logs);
        setTotalPages(data.totalPages);
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      } finally {
        isFetching.current = false;
      }
    };
    
    doFetch();
  }, [currentPage]);

  const handleToggleLogging = async () => {
    try {
      await api.updateUserLogging(!isLoggingEnabled);
      setIsLoggingEnabled(!isLoggingEnabled);
    } catch (err) {
      alert('Failed to update logging settings');
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | string)[] = [];
    const maxButtons = 7;

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        startPage = 2;
        endPage = Math.min(5, totalPages - 1);
      }

      if (currentPage >= totalPages - 2) {
        startPage = Math.max(2, totalPages - 4);
        endPage = totalPages - 1;
      }

      if (startPage > 2) pages.push('...');

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages - 1) pages.push('...');

      pages.push(totalPages);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <Icon icon="lucide:chevron-left" className="w-4 h-4" />
        </Button>

        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-white/40">
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setCurrentPage(page as number)}
            >
              {page}
            </Button>
          )
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <Icon icon="lucide:chevron-right" className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Request Logs</h1>
          <p className="text-white/60">
            View and analyze your API request history
          </p>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <span className="text-sm font-medium">Enable Logging</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={isLoggingEnabled}
              onChange={handleToggleLogging}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
          </div>
        </label>
      </motion.div>

      {/* Logs List */}
      <div className="space-y-3">
        {logs.length === 0 ? (
          <Card className="text-center py-12">
            <Icon icon="lucide:file-text" className="w-16 h-16 mx-auto mb-4 text-white/40" />
            <h3 className="text-lg font-semibold mb-2">No Logs Found</h3>
            <p className="text-white/60">
              {isLoggingEnabled
                ? 'Your request logs will appear here'
                : 'Enable logging to start tracking requests'}
            </p>
          </Card>
        ) : (
          logs.map((log, index) => (
            <motion.div
              key={log._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card hover onClick={() => setSelectedLog(log)} className="cursor-pointer">
                <div className="flex items-center gap-4">
                  {/* Status */}
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      log.statusCode >= 400
                        ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                        : 'bg-green-500/20 border border-green-500/40 text-green-400'
                    }`}
                  >
                    {log.statusCode}
                  </span>

                  {/* Time */}
                  <span className="text-sm text-white/60">
                    {formatDate(log.createdAt)}
                  </span>

                  {/* Tokens */}
                  <span className="ml-auto text-sm font-medium">
                    {log.usage?.total_tokens || 'N/A'} tokens
                  </span>

                  {/* View Button */}
                  <Button variant="ghost" size="sm">
                    <Icon icon="lucide:eye" className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {renderPagination()}

      {/* Log Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLog(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-bg-2 border border-white/14 rounded-2xl shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between p-6 border-b border-white/14">
                <div>
                  <h2 className="text-xl font-bold mb-2">Log Details</h2>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        selectedLog.statusCode >= 400
                          ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                          : 'bg-green-500/20 border border-green-500/40 text-green-400'
                      }`}
                    >
                      {selectedLog.statusCode}
                    </span>
                    <span className="text-sm text-white/60">
                      {formatDate(selectedLog.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {selectedLog.usage?.total_tokens || 'N/A'} tokens
                  </span>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <Icon icon="lucide:x" className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] custom-scrollbar">
                {/* Response */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Icon icon="lucide:code" className="w-4 h-4" />
                    Response
                  </h3>
                  <pre className="bg-black/30 border border-white/10 rounded-xl p-4 overflow-x-auto text-xs font-mono custom-scrollbar">
                    {JSON.stringify(selectedLog.responseBody, null, 2)}
                  </pre>
                </div>

                {/* Placeholders */}
                {selectedLog.placeholders &&
                  Object.keys(selectedLog.placeholders).some(
                    (key) => selectedLog.placeholders?.[key as keyof LogPlaceholders]
                  ) && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Icon icon="lucide:database" className="w-4 h-4" />
                        Request Data
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(selectedLog.placeholders).map(
                          ([key, value]) =>
                            value && (
                              <details
                                key={key}
                                className="bg-white/5 border border-white/14 rounded-xl overflow-hidden"
                              >
                                <summary className="cursor-pointer p-3 font-medium text-sm hover:bg-white/5 transition-colors">
                                  {key.replace(/_/g, ' ').toUpperCase()}
                                </summary>
                                <div className="p-4 pt-0 text-sm text-white/80 whitespace-pre-wrap font-mono">
                                  {value}
                                </div>
                              </details>
                            )
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}