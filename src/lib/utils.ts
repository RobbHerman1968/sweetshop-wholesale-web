import { twMerge } from 'tailwind-merge';

export function cn(...classes: Array<string | null | undefined | false>) {
  return twMerge(classes.filter(Boolean).join(' '));
}

