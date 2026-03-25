'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application Crash:', error);
  }, [error]);

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0d14', color: 'white', padding: 20 }}>
      <div style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{ background: '#ef444415', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid #ef444433' }}>
          <AlertCircle size={40} color="#ef4444" />
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 10px' }}>Something went wrong</h1>
        <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: 30 }}>
          We encountered an unexpected error. This might be a temporary issue with our services.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, border: 'none',
              background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer', transition: 'filter 0.2s'
            }}
          >
            <RefreshCcw size={18} /> Try again
          </button>

          <Link
            href="/"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, border: '1px solid #334155',
              background: 'transparent', color: 'white', fontWeight: 600, textDecoration: 'none', transition: 'background 0.2s'
            }}
          >
            <Home size={18} /> Back Home
          </Link>
        </div>

        {error.digest && (
          <p style={{ marginTop: 20, fontSize: '0.7rem', color: '#475569' }}>
            Error Reference: <code>{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  );
}
