'use client';

import React from 'react';
import notify from '@/lib/notifications';
import { motion } from 'framer-motion';
import { CheckCircle2, Printer, Share2, ArrowRight } from 'lucide-react';

export interface SessionMetrics {
  cartId: string;
  teamMemberId: string;
  totalItemsPacked: number;
  totalReplacements: number;
  totalShorts: number;
}

interface SessionCompleteProps {
  metrics: SessionMetrics;
  onNewSession: () => void;
}

const SessionComplete: React.FC<SessionCompleteProps> = ({ metrics, onNewSession }) => {
  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const text = `Cart ${metrics.cartId} Packed!\nPicker: ${metrics.teamMemberId}\nTotal Items: ${metrics.totalItemsPacked}\nReplacements: ${metrics.totalReplacements}\nShorts: ${metrics.totalShorts}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Packing Slip: ${metrics.cartId}`,
          text: text,
        });
      } catch (error) {
        console.log('User cancelled share or share failed');
      }
    } else {
      // Fallback for browsers that don't support native share (like desktop Chrome sometimes)
      navigator.clipboard.writeText(text).then(() => {
        notify.success('Packing summary copied to clipboard!');
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="app-container"
      style={{ justifyContent: 'center', alignItems: 'center', padding: 20 }}
    >
      <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10, delay: 0.2 }}
          style={{ width: 100, height: 100, background: '#00ff8822', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px', color: '#00ff88' }}
        >
          <CheckCircle2 size={60} />
        </motion.div>

        <h1 style={{ fontSize: '2rem', marginBottom: 10 }}>Session Complete!</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: 40 }}>
          Cart {metrics.cartId} has been successfully packed and synced to Airtable.
        </p>

        <div className="card" style={{ padding: 20, textAlign: 'left', marginBottom: 30 }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Session Summary</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Cart ID:</span>
            <span style={{ fontWeight: 800 }}>{metrics.cartId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Picker ID:</span>
            <span style={{ fontWeight: 800 }}>{metrics.teamMemberId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total Items Packed:</span>
            <span style={{ fontWeight: 800, color: '#00ff88' }}>{metrics.totalItemsPacked}</span>
          </div>
          {metrics.totalReplacements > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: metrics.totalShorts > 0 ? 10 : 0 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Replacements Made:</span>
              <span style={{ fontWeight: 800, color: '#f59e0b' }}>{metrics.totalReplacements}</span>
            </div>
          )}
          {metrics.totalShorts > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Shortages Reported:</span>
              <span style={{ fontWeight: 800, color: '#ef4444' }}>{metrics.totalShorts}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 15, marginBottom: 30 }} className="no-print">
          <button onClick={handlePrint} className="btn-primary" style={{ flex: 1, background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
            <Printer size={20} style={{ marginRight: 8 }} /> Print Slip
          </button>
          <button onClick={handleShare} className="btn-primary" style={{ flex: 1, background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
            <Share2 size={20} style={{ marginRight: 8 }} /> Share
          </button>
        </div>

        <button
          className="btn-primary no-print"
          onClick={onNewSession}
          style={{ width: '100%', padding: '16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          Start Next Cart <ArrowRight size={20} />
        </button>

      </div>
    </motion.div>
  );
};

export default SessionComplete;
