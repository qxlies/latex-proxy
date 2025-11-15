import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  open: boolean;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: ModalSize;
  hideClose?: boolean;
  className?: string;
}

const sizeToMaxW: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
};

export function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  size = 'md',
  hideClose = false,
  className = '',
}: ModalProps) {
  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[200] bg-black/60 backdrop-blur-xl"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.99, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: 6 }}
            transition={{ type: 'spring', damping: 22, stiffness: 380, mass: 0.8 }}
            className={`fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[210] flex items-center justify-center p-4 pointer-events-none ${className}`}
            aria-modal="true"
            role="dialog"
          >
            <div
              className={`w-full ${sizeToMaxW[size]} panel border border-white/14 rounded-2xl shadow-2xl bg-bg-2/80 backdrop-blur-xl pointer-events-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/12">
                <div className="text-lg font-semibold">{title}</div>
                {!hideClose && (
                  <button
                    className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors"
                    onClick={onClose}
                    aria-label="Close"
                  >
                    <Icon icon="lucide:x" className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="p-4">
                {children}
              </div>

              {footer && (
                <div className="p-4 pt-0">
                  <div className="flex items-center justify-end gap-2">
                    {footer}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function ModalSection({
  title,
  children,
  description,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      {(title || description) && (
        <div>
          {title && <div className="text-sm font-medium">{title}</div>}
          {description && <div className="text-xs text-white/60">{description}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Disclosure (spoiler) block for optional/advanced settings
 */
export function ModalDisclosure({
  title,
  children,
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="rounded-xl border border-white/14 bg-white/5" open={defaultOpen}>
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium flex items-center gap-2">
        <Icon icon="lucide:chevrons-down-up" className="w-4 h-4" />
        {title}
      </summary>
      <div className="px-4 pb-4">
        {children}
      </div>
    </details>
  );
}

/**
 * ToggleSwitch – glassmorphism switch like the one used in Merge Consecutive Roles
 */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        id={id}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        className={`relative inline-flex w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/40 ${
          checked ? 'bg-emerald-500' : 'bg-white/20'
        }`}
        title={typeof label === 'string' ? label : undefined}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      {label && (
        <label htmlFor={id} className="text-sm font-medium cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  );
}

/**
 * PopoverSelect – lightweight custom select, matching role dropdown styling
 */
export function PopoverSelect<T extends string>({
  value,
  options,
  onChange,
  renderBadge,
  placeholder = 'Select...',
  disabled,
}: {
  value: T | '';
  options: Array<{ value: T; label: string }>;
  onChange: (val: T) => void;
  renderBadge?: (val: T) => ReactNode;
  placeholder?: string;
  disabled?: boolean;
}) {
  // no local state; using <details> for open/close behavior

  // Instead of tricky local state above, use a details element for accessibility and zero JS.
  return (
    <details className="relative group" open={false}>
      <summary
        className={`input list-none flex items-center justify-between ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        role="button"
        aria-disabled={disabled}
      >
        <span className="flex items-center gap-2">
          {value ? (renderBadge ? renderBadge(value) : null) : null}
          <span className={!value ? 'text-white/50' : ''}>
            {value ? options.find(o => o.value === value)?.label : placeholder}
          </span>
        </span>
        <Icon icon="lucide:chevron-down" className="w-4 h-4 opacity-70" />
      </summary>
      <div className="absolute z-20 mt-2 w-full bg-bg-2/95 backdrop-blur-sm border border-white/14 rounded-xl shadow-2xl overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              onChange(opt.value);
              // Close details
              const el = (e.currentTarget.closest('details') as HTMLDetailsElement | null);
              if (el) el.open = false;
            }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 ${
              value === opt.value ? 'text-accent-1' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              {renderBadge ? renderBadge(opt.value) : null}
              <span>{opt.label}</span>
            </div>
          </button>
        ))}
      </div>
    </details>
  );
}
import { Button } from './Button';
import { useState } from 'react';

/**
 * ConfirmModal — simple confirm dialog built on Modal
 */
export function ConfirmModal({
  open,
  title = 'Confirm',
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
}: {
  open: boolean;
  title?: ReactNode;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      {description && (
        <div className="text-sm text-white/80">{description}</div>
      )}
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}

/**
 * PromptModal — input dialog (single-line) built on Modal
 */
export function PromptModal({
  open,
  title = 'Enter value',
  label,
  placeholder,
  defaultValue = '',
  confirmText = 'Save',
  cancelText = 'Cancel',
  onSubmit,
  onCancel,
  validate,
}: {
  open: boolean;
  title?: ReactNode;
  label?: ReactNode;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  validate?: (value: string) => string | null; // return error or null
}) {
  const [value, setValue] = useState<string>(defaultValue);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setError('');
    }
  }, [open, defaultValue]);

  const onConfirm = () => {
    const err = validate ? validate(value.trim()) : null;
    if (err) {
      setError(err);
      return;
    }
    onSubmit(value.trim());
  };

  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="space-y-3">
        {label && <div className="text-xs text-white/60 font-medium">{label}</div>}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className={`input ${error ? 'border-red-500/60' : ''}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onConfirm();
            }
          }}
          autoFocus
        />
        {error && <div className="text-xs text-red-400">{error}</div>}
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}