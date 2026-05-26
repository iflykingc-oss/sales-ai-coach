import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = 'default', ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-1',
        variant === 'error' && 'border-red-300 focus:border-red-500 focus:ring-red-500',
        variant === 'success' && 'border-green-300 focus:border-green-500 focus:ring-green-500',
        variant === 'default' && 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
export { Input };
