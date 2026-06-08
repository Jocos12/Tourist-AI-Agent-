import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class names with Tailwind-aware conflict resolution.
 *
 * Lets a consumer override a primitive's classes via the `className` prop —
 * `cn('px-4 bg-surface', 'bg-gold')` keeps `bg-gold`, not both.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
