import { cn } from '../../lib/utils';

interface LoadingProps {
  fullscreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Loading({ fullscreen, size = 'md', className }: LoadingProps) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const spinner = (
    <div
      className={cn(
        'border-accent-1/30 border-t-accent-1 rounded-full animate-spin',
        sizes[size],
        className
      )}
    />
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-1/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}