import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // ms
  createdAt: number;
}

interface NotificationState {
  toasts: Toast[];
  add: (toast: Omit<Toast, 'id' | 'createdAt'>) => string;
  remove: (id: string) => void;
  clear: () => void;
}

export const useNotifications = create<NotificationState>((set) => ({
  toasts: [],
  add: ({ type, message, duration }) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = {
      id,
      type,
      message,
      duration: duration ?? 3000,
      createdAt: Date.now(),
    };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    return id;
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

// Helper to trigger notifications from anywhere
export function notify(message: string, type: ToastType = 'info', duration?: number) {
  return useNotifications.getState().add({ type, message, duration });
}