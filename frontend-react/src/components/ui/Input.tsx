import { forwardRef, type InputHTMLAttributes, useRef } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = 'text', onFocus, ...props }, ref) => {
    const isPassword = type === 'password';
    const randRef = useRef<string>(Math.random().toString(36).slice(2));

    const isAuthPassword =
      isPassword &&
      (
        props.name === 'current-password' ||
        props.name === 'new-password' ||
        props.autoComplete === 'current-password' ||
        props.autoComplete === 'new-password' ||
        (props.id?.startsWith?.('auth_') ?? false)
      );

    const useMaskedText = isPassword && !isAuthPassword;
    const finalType = useMaskedText ? 'text' : type;

    const maskStyle = useMaskedText
      ? ({ WebkitTextSecurity: 'disc' } as any)
      : undefined;

    const antiAutoAttrs: any = {
      autoComplete: props.autoComplete ?? (useMaskedText ? 'one-time-code' : (isPassword ? undefined : 'off')),
      // @ts-ignore
      autoCapitalize: (props as any)?.autoCapitalize ?? 'none',
      autoCorrect: (props as any)?.autoCorrect ?? 'off',
      spellCheck: props.spellCheck ?? false,
      name:
        props.name ??
        (useMaskedText ? `f_${randRef.current}` : undefined),
      id:
        props.id ??
        (useMaskedText ? `i_${randRef.current}` : undefined),
      'data-lpignore': (props as any)?.['data-lpignore'] ?? (useMaskedText ? 'true' : undefined),
      'data-1p-ignore': (props as any)?.['data-1p-ignore'] ?? (useMaskedText ? 'true' : undefined),
      'aria-autocomplete': (props as any)?.['aria-autocomplete'] ?? (useMaskedText ? 'none' : undefined),
     
      inputMode: props.inputMode ?? (useMaskedText ? 'text' : undefined),
      
      role: (props as any)?.role ?? (useMaskedText ? 'presentation' : undefined),
      'aria-label': props['aria-label'] ?? (useMaskedText ? 'API Key' : undefined),
    };

    const inputProps: InputHTMLAttributes<HTMLInputElement> = { ...props };
    if (useMaskedText && inputProps.readOnly === undefined) {
      inputProps.readOnly = true;
    }

    const handleFocus: React.FocusEventHandler<HTMLInputElement> = (e) => {
      if (useMaskedText && (e.target as HTMLInputElement).hasAttribute('readonly')) {
        (e.target as HTMLInputElement).removeAttribute('readonly');
      }
      onFocus?.(e);
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs text-white/60 mb-2 font-medium">
            {label}
          </label>
        )}
        <input
          type={finalType}
          style={maskStyle}
          {...antiAutoAttrs}
          {...inputProps}
          onFocus={handleFocus}
          className={cn('input', error && 'border-red-500/50', className)}
          ref={ref}
        />
        {error && (
          <p className="mt-1.5 text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';