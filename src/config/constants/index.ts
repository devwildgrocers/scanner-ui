/**
 * Global application configuration
 */
export const APP_CONFIG = {
  /**
   * Toggle for entire project authentication and authorization
   */
  AUTH_ENABLED: process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true',

  /**
   * API base URL
   */
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
} as const;
