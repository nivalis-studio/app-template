import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge multiple class strings together
 * @param {...any} inputs classNames
 * @returns {string} merged classNames
 */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
