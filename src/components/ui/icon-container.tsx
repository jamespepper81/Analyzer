import { cn } from '@/lib/utils';

type IconContainerProps = {
  children: React.ReactNode;
  variant?: 'primary' | 'emerald' | 'rose' | 'blue' | 'orange' | 'purple' | 'amber';
  className?: string;
};

const VARIANT_CLASSES = {
  primary: 'bg-primary/10 text-primary',
  emerald: 'bg-success/10 text-success',
  rose: 'bg-chart-negative/10 text-chart-negative',
  blue: 'bg-info/10 text-info',
  orange: 'bg-primary/10 text-primary',
  purple: 'bg-chart-purple/10 text-chart-purple',
  amber: 'bg-warning/10 text-warning',
} as const;

export function IconContainer({
  children,
  variant = 'primary',
  className
}: IconContainerProps) {
  return (
    <div className={cn("p-2 rounded-lg transition-colors duration-200 w-fit", VARIANT_CLASSES[variant], className)}>
      {children}
    </div>
  );
}
