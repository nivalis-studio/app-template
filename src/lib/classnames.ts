import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';

/**
 * Merge multiple class strings together
 * @param {...any} inputs classNames
 * @returns {string} merged classNames
 */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
