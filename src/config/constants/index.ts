/**
 * Global application configuration
 */
export const APP_CONFIG = {
  /**
   * Toggle for entire project authentication and authorization
   */
  AUTH_ENABLED: process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true',

  /**
   * API base URL. Using the permanent production endpoint provided by Cloud Run.
   */
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://scanner-backend-1021271918187.europe-west1.run.app/api',
} as const;
