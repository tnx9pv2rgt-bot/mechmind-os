'use client';

import { cn } from '@/lib/utils';
import { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react';

interface AppleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'text';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
}

export const AppleButton = forwardRef<HTMLButtonElement, AppleButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      fullWidth = false,
      loading = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 font-medium transition-all duration-300 ease-apple rounded-pill disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] min-h-[44px]';

    const variants = {
      primary: 'bg-apple-blue text-white hover:bg-apple-blue-hover hover:shadow-apple',
      secondary:
        'bg-white dark:bg-[#2f2f2f] text-apple-dark dark:text-[#ececec] border border-apple-border dark:border-[#424242] hover:bg-apple-light-gray dark:hover:bg-[#3a3a3a]',
      ghost: 'bg-transparent text-apple-blue hover:bg-apple-blue/10',
      text: 'bg-transparent text-apple-blue hover:underline px-0',
    };

    const sizes = {
      sm: 'px-4 py-2 text-xs',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24'>
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
              fill='none'
            />
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            />
          </svg>
        ) : (
          <>
            {icon && iconPosition === 'left' && <span className='flex-shrink-0'>{icon}</span>}
            {children}
            {icon && iconPosition === 'right' && <span className='flex-shrink-0'>{icon}</span>}
          </>
        )}
      </button>
    );
  }
);

AppleButton.displayName = 'AppleButton';
