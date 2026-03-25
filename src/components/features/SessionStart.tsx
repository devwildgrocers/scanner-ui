'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Clipboard, Play } from 'lucide-react';
import notify from "@/lib/notifications";
import scannerService from "@/services/scanner.service";
import type { TeamMember, Cart } from "@/interfaces";

interface SessionStartProps {
  onSessionStart: (data: { teamMemberId: string; cartId: string }) => void;
}

const SessionStart: React.FC<SessionStartProps> = ({ onSessionStart }) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [carts, setCarts] = useState<Cart[]>([]);
  const [selectedTeamMember, setSelectedTeamMember] = useState('');
  const [selectedCart, setSelectedCart] = useState('');
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membersRes, cartsRes] = await Promise.all([
          scannerService.getTeamMembers(),
          scannerService.getCarts()
        ]);
        setTeamMembers(membersRes.data);
        setCarts(cartsRes.data);
      } catch (err: any) {
        console.error('Failed to load initial data:', err);
        notify.error('Failed to connect to scanner service', {
          description: err.message
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStart = async () => {
    if (!selectedTeamMember || !selectedCart) return;

    setIsStarting(true);
    try {
      await scannerService.startSession(selectedTeamMember, selectedCart);
      onSessionStart({ teamMemberId: selectedTeamMember, cartId: selectedCart });
    } catch (err: any) {
      console.error('Failed to start session:', err);
      notify.error('Could not start session', {
        description: err.message || 'Please try again.'
      });
    } finally {
      setIsStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ width: 40, height: 40, border: '4px solid #1e2430', borderTop: '4px solid #00ff88', borderRadius: '50%' }}
        />
        <p style={{ marginTop: 20, color: 'var(--text-secondary)' }}>Connecting to system...</p>
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
        <motion.h1
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          style={{ margin: 0, fontSize: '2.4rem', fontWeight: 800 }}
        >
          Scanner <span style={{ color: 'var(--primary-color)' }}>Hub</span>
        </motion.h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Ready to start your picking session?</p>
      </header>

      <motion.div
        className="card"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="dropdown-wrapper">
          <label><User size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Team Member</label>
          <select
            value={selectedTeamMember}
            onChange={(e) => setSelectedTeamMember(e.target.value)}
          >
            <option value="">Select your name</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="dropdown-wrapper">
          <label><Clipboard size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Active Cart</label>
          <select
            value={selectedCart}
            onChange={(e) => setSelectedCart(e.target.value)}
          >
            <option value="">Select a cart</option>
            {carts.map(c => (
              <option key={c.id} value={c.cartId}>{c.cartId}</option>
            ))}
          </select>
        </div>

        <button
          className="btn-primary"
          disabled={!selectedTeamMember || !selectedCart || isStarting}
          onClick={handleStart}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          {isStarting ? 'Setting up...' : (
            <>
              <Play fill="#000" size={18} /> START SESSION
            </>
          )}
        </button>
      </motion.div>

      <footer style={{ marginTop: 'auto', padding: '30px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
        Warehouse Scanner v1.0.0 • Connected to Airtable
      </footer>
    </motion.div>
  );
};

export default SessionStart;
