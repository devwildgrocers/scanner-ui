// Notifications Wrapper
import { toast, ExternalToast } from 'sonner';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

/**
 * Interface for standard notification options
 */
export interface NotificationOptions extends ExternalToast {
  description?: string;
}

/**
 * Standard Centralized Notification System
 * Uses sonner with Lucide icons for high-quality UI feedback.
 */
export const notify = {
  /**
   * Show a success notification (Green)
   */
  success: (message: string, options?: NotificationOptions) => {
    return toast.success(message, {
      icon: <CheckCircle size={18} color="#10b981" />,
      ...options,
    });
  },

  /**
   * Show an error notification (Red)
   */
  error: (message: string, options?: NotificationOptions) => {
    return toast.error(message, {
      icon: <AlertCircle size={18} color="#ef4444" />,
      ...options,
    });
  },

  /**
   * Show an informational notification (Blue)
   */
  info: (message: string, options?: NotificationOptions) => {
    return toast.info(message, {
      icon: <Info size={18} color="#3b82f6" />,
      ...options,
    });
  },

  /**
   * Show a warning notification (Yellow)
   */
  warning: (message: string, options?: NotificationOptions) => {
    return toast.warning(message, {
      icon: <AlertTriangle size={18} color="#f59e0b" />,
      ...options,
    });
  },

  /**
   * Show a generic toast notification
   */
  message: (message: string, options?: NotificationOptions) => {
    return toast(message, {
      ...options,
    });
  },

  /**
   * Show a loading notification
   */
  loading: (message: string, options?: NotificationOptions) => {
    return toast.loading(message, {
      ...options,
    });
  },

  /**
   * Dismiss a specific notification
   */
  dismiss: (id?: string | number) => {
    return toast.dismiss(id);
  },

  /**
   * Handle an async promise with automatic toast feedback
   */
  promise: <T,>(
    promise: Promise<T>,
    {
      loading = 'Processing...',
      success = 'Successfully completed!',
      error = 'Something went wrong',
    }: {
      loading?: string;
      success?: string | ((data: T) => string);
      error?: string | ((err: any) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    });
  },
};

export default notify;
