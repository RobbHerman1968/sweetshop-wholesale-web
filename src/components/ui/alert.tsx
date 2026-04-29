import * as React from 'react';
import { cn } from '@/lib/utils';

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'destructive' }>(({ className, variant = 'default', ...props }, ref) => <div ref={ref} role="alert" className={cn('relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7', variant === 'destructive' && 'border-red-200 bg-[#ffffff] text-red-900 [&>svg]:text-red-800 dark:border-red-500/50 dark:bg-red-950/30 dark:text-red-100 [&>svg]:dark:text-red-200', variant === 'default' && 'border-[#c49a78] bg-[#f8eddf] text-[#4a2518]', className)} {...props} />);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => <h5 ref={ref as React.Ref<HTMLParagraphElement>} className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <div ref={ref} className={cn('text-xs [&_p]:leading-relaxed', className)} {...props} />);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
