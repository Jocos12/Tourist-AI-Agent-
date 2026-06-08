import { cn } from '@/lib/design/cn'

/** Skeleton — shimmer placeholder. Size it with `className` (w-/h-/rounded-). */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse motion-reduce:animate-none bg-surface2 rounded-md', className)}
      aria-hidden
      {...props}
    />
  )
}

/** Multi-line text skeleton; the last line is shortened. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}
