import { cn } from '@/lib/utils';

type IconContainerProps = {
  children: React.ReactNode;
  variant?: 'primary' | 'emerald' | 'rose' | 'blue' | 'orange' | 'purple' | 'amber';
  className?: string;
};

const VARIANT_CLASSES = {
  primary: 'bg-primary/10 text-primary',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
} as const;

export function IconContainer({ 
  children, 
  variant = 'primary',
  className 
}: IconContainerProps) {
  
  return (
    <div className={cn("p-2 rounded-lg transition-colors duration-200", VARIANT_CLASSES[variant], className)}>
      {children}
    </div>
  );
}
