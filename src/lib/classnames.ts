import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ClassValue } from 'clsx';

/**
 * Merge multiple class strings together
 * @param {...any} inputs classNames
 * @returns {string} merged classNames
 */
export const cn = (...inputs: Array<ClassValue>): string =>
  twMerge(clsx(inputs));
