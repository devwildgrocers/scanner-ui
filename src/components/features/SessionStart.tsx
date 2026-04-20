'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, QrCode, ArrowLeft, Loader2 } from 'lucide-react';
import scannerService from "@/services/scanner.service";
import notify from "@/lib/notifications";

interface SessionStartProps {
  onSessionStart: (data: { 
    teamMemberId: string; 
    teamMemberName?: string;
    cartId: string; 
    cartStatus?: string;
    assignments?: Record<string, string>;
    summary?: any;
  }) => void;
}

const SessionStart: React.FC<SessionStartProps> = ({ onSessionStart }) => {
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [scanValue, setScanValue] = useState('');
  
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const membersRes = await scannerService.getTeamMembers();
        setTeamMembers(membersRes.data);
      } catch (err: any) {
        console.error('Failed to load team members:', err);
        notify.error('Could not connect to system', { description: err.message });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedMemberId && !isStarting) {
        const timer = setInterval(() => {
            scanInputRef.current?.focus();
        }, 500);
        return () => clearInterval(timer);
    }
  }, [selectedMemberId, isStarting]);

  const handleCartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanValue.trim()) return;

    const cartIdScanned = scanValue.trim();
    setScanValue('');
    setIsStarting(true);

    try {
      const res = await scannerService.startSession(selectedMemberId, cartIdScanned);
      const data = res.data;

      onSessionStart({ 
        teamMemberId: data?.teamMemberId || selectedMemberId, 
        teamMemberName: data?.teamMemberName,
        cartId: cartIdScanned, 
        cartStatus: res.data?.cartStatus,
        assignments: res.data?.assignments,
        summary: res.data?.summary
      });
    } catch (err: any) {
      console.error('Session start failed:', err);
      const backendMessage = err.response?.data?.message || err.message || 'Unknown error';
      let title = 'Invalid Cart or Network Error';
      if (backendMessage.includes('"Complete"')) {
        title = 'Cart Already Complete';
      } else if (backendMessage.includes('"In Use"')) {
        title = 'Cart Currently In Use';
      }
      notify.error(title, { description: backendMessage });
      setIsStarting(false);
    }
  };

  if (isLoading || isStarting) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
        <p style={{ marginTop: 20, color: 'var(--text-secondary)', fontWeight: 600, fontSize: '1.2rem', letterSpacing: '0.05em' }}>
          {isStarting ? 'Starting Session...' : 'Connecting to System...'}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="app-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: '0 24px' }}
    >
      <header style={{ padding: '40px 0 30px' }}>
        <h1 style={{ margin: 0, fontSize: '2.4rem', fontWeight: 800 }}>
          Scanner <span style={{ color: 'var(--primary-color)' }}>Hub</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Ready to start your picking session?</p>
      </header>

      {/* Hidden scan input */}
       <form onSubmit={handleCartScan} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
          <input ref={scanInputRef} type="text" value={scanValue} onChange={e => setScanValue(e.target.value)} autoFocus inputMode="none" />
       </form>

      <AnimatePresence mode="wait">
        {!selectedMemberId ? (
          <motion.div key="name-selection" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="card">
             <div className="dropdown-wrapper">
               <label htmlFor="team-member-select"><User size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Team Member</label>
               <select
                 id="team-member-select"
                 value={selectedMemberId}
                 onChange={(e) => setSelectedMemberId(e.target.value)}
               >
                 <option value="">Select your name</option>
                 {teamMembers.map(m => (
                   <option key={m.id} value={m.id}>{m.name}</option>
                 ))}
               </select>
             </div>
          </motion.div>
        ) : (
          <motion.div key="scan-prompt" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
             <div style={{ display: 'inline-flex', padding: 24, background: 'var(--primary-color)', borderRadius: '50%', marginBottom: 24, color: '#000' }}>
               <QrCode size={48} />
             </div>
             <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 12 }}>Ready to Scan Cart</h2>
             <p style={{ color: 'var(--text-secondary)', marginBottom: 40 }}>
                Please scan the cart's QR code to begin mapping your 6 orders.
             </p>
             <button 
               onClick={() => setSelectedMemberId('')}
               style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto' }}
             >
               <ArrowLeft size={14} /> BACK TO NAMES
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      <footer style={{ marginTop: 'auto', padding: '30px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
        Warehouse Scanner v1.0.0 • Connected to Airtable
      </footer>
    </motion.div>
  );
};

export default SessionStart;
