import { useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useNotifications } from '../store/notifications';

export default function Toasts() {
  const { toasts, remove } = useNotifications();

  useEffect(() => {
    // auto-dismiss
    toasts.forEach((t) => {
      if (!t.duration) return;
      const ms = t.duration;
      const id = setTimeout(() => remove(t.id), ms);
      return () => clearTimeout(id);
    });
  }, [toasts]);

  if (!toasts.length) return null;

  const typeStyles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    success: {
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/30',
      text: 'text-emerald-300',
      icon: 'lucide:check-circle',
    },
    error: {
      bg: 'bg-red-500/15',
      border: 'border-red-500/30',
      text: 'text-red-300',
      icon: 'lucide:alert-triangle',
    },
    info: {
      bg: 'bg-blue-500/15',
      border: 'border-blue-500/30',
      text: 'text-blue-300',
      icon: 'lucide:info',
    },
    warning: {
      bg: 'bg-yellow-500/15',
      border: 'border-yellow-500/30',
      text: 'text-yellow-300',
      icon: 'lucide:alert-circle',
    },
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-[min(360px, 92vw)]">
      {toasts.map((t) => {
        const s = typeStyles[t.type] ?? typeStyles.info;
        return (
          <div
            key={t.id}
            className={`rounded-xl border ${s.bg} ${s.border} backdrop-blur-xl shadow-xl p-3 flex items-start gap-3`}>
            <Icon icon={s.icon} className={`w-5 h-5 ${s.text} flex-shrink-0 mt-0.5`} />
            <div className="text-sm text-white/90 flex-1">{t.message}</div>
            <button
              onClick={() => remove(t.id)}
              className="text-white/50 hover:text-white/90 transition-colors">
              <Icon icon="lucide:x" className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}