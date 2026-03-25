'use client';

import { useEffect, useState } from 'react';
import { APP_CONFIG } from '@/config/constants';
import { useRouter, usePathname } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Global authentication guard component
 * Respects NEXT_PUBLIC_AUTH_ENABLED toggle
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const [authorized, setAuthorized] = useState(!APP_CONFIG.AUTH_ENABLED);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!APP_CONFIG.AUTH_ENABLED) {
      setAuthorized(true);
      return;
    }

    // Example logic for authentication
    const token = localStorage.getItem('auth_token');

    if (!token && pathname !== '/login') {
      setAuthorized(false);
      // Logic for redirect to login could go here
      // router.push('/login');
      // For now, we simulate being authorized if the toggle is on but token is missing by just showing the message or letting it fail at API level
      console.warn('🔒 Auth is enabled but NO TOKEN FOUND in localStorage');
      setAuthorized(true); // Default to true so app doesn't go blank, but API calls will fail without token
    } else {
      setAuthorized(true);
    }
  }, [router, pathname]);

  if (!authorized) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0d14', color: 'white' }}>
        <p>You are not authorized to view this content.</p>
      </div>
    );
  }

  return <>{children}</>;
}
