/**
 * Example utility for cleaner className merging (if Tailwind is integrated)
 */
export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

/**
 * Basic delay helper
 */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
