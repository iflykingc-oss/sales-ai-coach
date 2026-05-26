import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

const variantDefaults: Record<ToastVariant, { duration: number }> = {
  success: { duration: 4000 },
  error: { duration: 6000 },
  info: { duration: 3000 },
  warning: { duration: 5000 },
};

export function toast(message: string, opts?: { description?: string; variant?: ToastVariant; duration?: number }) {
  const { toasts, addToast } = useToastStore.getState();
  // Prevent duplicates
  if (toasts.some((t) => t.title === message)) return;
  const variant = opts?.variant || 'info';
  addToast({
    title: message,
    description: opts?.description,
    variant,
    duration: opts?.duration ?? variantDefaults[variant].duration,
  });
}

toast.success = (title: string, opts?: { description?: string; duration?: number }) =>
  toast(title, { ...opts, variant: 'success' });
toast.error = (title: string, opts?: { description?: string; duration?: number }) =>
  toast(title, { ...opts, variant: 'error' });
toast.info = (title: string, opts?: { description?: string; duration?: number }) =>
  toast(title, { ...opts, variant: 'info' });
toast.warning = (title: string, opts?: { description?: string; duration?: number }) =>
  toast(title, { ...opts, variant: 'warning' });
