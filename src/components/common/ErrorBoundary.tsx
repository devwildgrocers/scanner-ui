'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Granular Error Boundary for wrapping specific feature areas
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Granular Error Boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="card" style={{ padding: 30, textAlign: 'center', border: '1px solid #ef444433', background: '#ef44440a' }}>
          <AlertCircle size={32} color="#ef4444" style={{ marginBottom: 15 }} />
          <h3 style={{ margin: '0 0 8px' }}>Component Error</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
            {this.state.error?.message || 'Something went wrong in this section.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: 'none',
              background: 'var(--surface-accent)', color: 'white', margin: '0 auto', cursor: 'pointer'
            }}
          >
            <RefreshCcw size={16} /> Retry Section
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
