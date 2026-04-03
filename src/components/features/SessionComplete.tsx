'use client';

import React from 'react';
import notify from '@/lib/notifications';
import { motion } from 'framer-motion';
import { CheckCircle2, Printer, Share2, ArrowRight } from 'lucide-react';

export interface BoxDetail {
  orderNumber: string;
  items: number;
  replacements: number;
  shorts: number;
  status: 'Complete' | 'Partial' | 'Issues';
  slot?: string;
}

export interface SessionMetrics {
  cartId: string;
  teamMemberId: string;
  teamMemberName: string;
  totalItemsPacked: number;
  totalReplacements: number;
  totalShorts: number;
  boxDetails: BoxDetail[];
  slotTotals?: Record<string, number>;
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
    const text = `Cart ${metrics.cartId} Packed!\nPicker: ${metrics.teamMemberName}\nTotal Items: ${metrics.totalItemsPacked}\nReplacements: ${metrics.totalReplacements}\nShorts: ${metrics.totalShorts}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Packing Slip: ${metrics.cartId}`,
          text: text,
        });
      } catch (error) {
        // User cancelled share or share failed
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="app-container"
      style={{ 
        flexDirection: 'column',
        padding: '16px 20px',
        overflowY: 'auto',
        height: '100vh',
        background: 'radial-gradient(circle at top right, rgba(0, 255, 136, 0.05), transparent 40%)',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 450, width: '100%' }}>
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, stiffness: 100, delay: 0.1 }}
          style={{ 
            width: 70, 
            height: 70, 
            background: 'linear-gradient(135deg, #00ff88, #00cc66)', 
            borderRadius: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 16px', 
            color: '#0a0a0a',
            boxShadow: '0 10px 24px rgba(0, 255, 136, 0.25)'
          }}
        >
          <CheckCircle2 size={40} strokeWidth={2.5} />
        </motion.div>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: 6, letterSpacing: '-0.02em' }}>All Packed!</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: 24, lineHeight: 1.4 }}>
          Cart <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{metrics.cartId}</span> successfully synced.
        </p>

        {/* Balanced Metrics Grid */}
        <div className="card" style={{ padding: '20px', textAlign: 'left', marginBottom: 20, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: 'span 2', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px' }}>
               <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Trolley Session</label>
               <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{metrics.cartId}</span>
               <span style={{ fontSize: '0.85rem', opacity: 0.5, marginLeft: 10 }}>• Picker: {metrics.teamMemberName || metrics.teamMemberId}</span>
            </div>

            <div style={{ background: 'rgba(0, 255, 136, 0.05)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(0, 255, 136, 0.1)' }}>
              <label style={{ display: 'block', fontSize: '0.65rem', color: '#00ff88', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Packed</label>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#00ff88' }}>{metrics.totalItemsPacked}</span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Substitute</label>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: metrics.totalReplacements > 0 ? '#f59e0b' : 'rgba(255,255,255,0.2)' }}>
                {metrics.totalReplacements}
              </span>
            </div>

            {metrics.totalShorts > 0 && (
              <div style={{ gridColumn: 'span 2', background: 'rgba(239, 68, 68, 0.05)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.7rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 700 }}>Total Shortages</label>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ef4444' }}>{metrics.totalShorts}</span>
              </div>
            )}
          </div>
          {/* Slot Breakdown Grid */}
        {metrics.slotTotals && (
          <div className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Trolley Slot Distribution</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {['A', 'B', 'C', 'D', 'E', 'F'].map(s => (
                <div key={s} style={{ 
                  background: (metrics.slotTotals?.[s] || 0) > 0 ? '#3b82f615' : 'rgba(255,255,255,0.02)', 
                  border: (metrics.slotTotals?.[s] || 0) > 0 ? '1px solid #3b82f640' : '1px solid rgba(255,255,255,0.05)',
                  padding: '8px', 
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: (metrics.slotTotals?.[s] || 0) > 0 ? '#3b82f6' : 'rgba(255,255,255,0.2)' }}>{s}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: (metrics.slotTotals?.[s] || 0) > 0 ? '#fff' : 'rgba(255,255,255,0.1)' }}>{metrics.slotTotals?.[s] || 0}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', fontSize: '0.75rem', opacity: 0.6, fontWeight: 700 }}>
              Σ Total: &nbsp; {Object.values(metrics.slotTotals || {}).reduce((a, b) => a + b, 0)} Items
            </div>
          </div>
        )}
      </div>

        {/* Box Breakdown */}
        <div style={{ marginBottom: 20, textAlign: 'left' }}>
           <h3 style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingLeft: 4 }}>Box Breakdown</h3>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {metrics.boxDetails.map((box, idx) => (
                <div key={idx} style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  padding: '10px 14px', 
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Slot {box.slot || '?'}</span>
                       <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{box.orderNumber.startsWith('#') ? box.orderNumber : `#${box.orderNumber}`}</span>
                    </div>
                    {box.status === 'Complete' ? (
                      <CheckCircle2 size={14} style={{ color: '#00ff88' }} />
                    ) : box.shorts > 0 ? (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                    ) : (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, fontSize: '0.75rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-primary)' }}>{box.items} items</span>
                    {box.replacements > 0 && <span style={{ color: '#f59e0b' }}>+ {box.replacements} Substitute</span>}
                    {box.shorts > 0 && <span style={{ color: '#ef4444' }}>+ {box.shorts} Short</span>}
                  </div>
                </div>
              ))}
           </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }} className="no-print">
          <button 
            onClick={handlePrint} 
            className="btn-primary" 
            style={{ 
              flex: 1, 
              height: '52px',
              background: 'transparent', 
              border: '1.5px solid var(--border-color)', 
              color: 'var(--text-primary)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontSize: '0.95rem',
              fontWeight: 700
            }}
          >
            <Printer size={20} /> Print
          </button>
          <button 
            onClick={handleShare} 
            className="btn-primary" 
            style={{ 
              flex: 1, 
              height: '52px',
              background: 'transparent', 
              border: '1.5px solid var(--border-color)', 
              color: 'var(--text-primary)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontSize: '0.95rem',
              fontWeight: 700
            }}
          >
            <Share2 size={20} /> Share
          </button>
        </div>

        <button
          className="btn-primary no-print"
          onClick={onNewSession}
          style={{ 
            width: '100%', 
            padding: '18px', 
            fontSize: '1.2rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '12px',
            borderRadius: '18px',
            background: 'linear-gradient(to right, #00ff88, #00cc66)',
            boxShadow: '0 8px 24px rgba(0, 255, 136, 0.25)',
            border: 'none',
            color: '#0a0a0a',
            fontWeight: 800
          }}
        >
          Next Session <ArrowRight size={22} />
        </button>

      </div>
    </motion.div>
  );
};

export default SessionComplete;
