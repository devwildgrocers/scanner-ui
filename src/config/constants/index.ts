/**
 * Global application configuration
 */
export const APP_CONFIG = {
  /**
   * Toggle for entire project authentication and authorization
   */
  AUTH_ENABLED: process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true',

  /**
   * API base URL. Fallback to an empty string to allow error boundaries to catch it.
   */
  API_URL: process.env.NEXT_PUBLIC_API_URL || '',
} as const;
