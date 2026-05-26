import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'basic' | 'bronze' | 'silver' | 'gold' | 'success' | 'warning' | 'danger';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        {
          'bg-gray-100 text-gray-800': variant === 'default',
          'bg-gray-200 text-gray-700': variant === 'basic',
          'bg-amber-700 text-white': variant === 'bronze',
          'bg-gray-400 text-white': variant === 'silver',
          'bg-yellow-400 text-gray-900': variant === 'gold',
          'bg-green-100 text-green-800': variant === 'success',
          'bg-yellow-100 text-yellow-800': variant === 'warning',
          'bg-red-100 text-red-800': variant === 'danger',
        },
        className
      )}
      {...props}
    />
  );
}
