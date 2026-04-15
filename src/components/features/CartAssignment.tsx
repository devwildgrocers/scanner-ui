'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Package, HelpCircle, Loader2 } from 'lucide-react';
import scannerService from "@/services/scanner.service";
import notify from "@/lib/notifications";

interface CartAssignmentProps {
  cartId: string;
  initialAssignments?: Record<string, string>;
  onComplete: () => void;
  onCancel: () => void;
}

type Step = 'scan-order' | 'scan-position';

/**
 * CartAssignment: Redesigned for professional alignment 
 * Matching the exact look and feel of the original Scanner Hub screens.
 */
const CartAssignment: React.FC<CartAssignmentProps> = ({ cartId, initialAssignments, onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState<Step>('scan-order');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, { orderId: string | null; scanned: boolean }>>(() => {
    const base: Record<string, { orderId: string | null; scanned: boolean }> = {
      'A': { orderId: null, scanned: false },
      'B': { orderId: null, scanned: false },
      'C': { orderId: null, scanned: false },
      'D': { orderId: null, scanned: false },
      'E': { orderId: null, scanned: false },
      'F': { orderId: null, scanned: false },
    };
    if (initialAssignments) {
      Object.entries(initialAssignments).forEach(([pos, orderId]) => {
        if (base[pos]) base[pos] = { orderId, scanned: true };
      });
    }
    return base;
  });

  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Focus trap listener forcing the hidden text input to always be active 
   * so hardware scanners immediately catch barcodes.
   */
  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, []);

  /**
   * State machine handler processing the incoming scanner string.
   * Maps to 'scan-order' block if empty, or 'scan-position' to locate slot.
   */
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const scannedValue = inputValue.trim().replace(/^#/, '');
    if (!scannedValue || isProcessing) return;

    setInputValue('');
    setIsProcessing(true);

    try {
      if (currentStep === 'scan-order') {
        const alreadyAssigned = Object.values(assignments).some(a => a.orderId === scannedValue);
        if (alreadyAssigned) {
          notify.error(`Order #${scannedValue} is already on this cart.`);
        } else {
          setCurrentOrderId(scannedValue);
          setCurrentStep('scan-position');
        }
      } else {
        // Support both formats:
        //   Legacy: just "A" through "F"
        //   New QR label format: "CART-01-A" (cart-id + dash + slot letter)
        let pos = scannedValue.toUpperCase();
        let scannedCartId: string | null = null;

        // Detect the full label format: anything ending in -<single letter A-F>
        const fullLabelMatch = pos.match(/^(.+)-([A-F])$/);
        if (fullLabelMatch) {
          scannedCartId = fullLabelMatch[1]; // e.g. "CART-01"
          pos = fullLabelMatch[2];           // e.g. "A"

          // Instant frontend validation — no backend call needed
          if (scannedCartId.toUpperCase() !== cartId.toUpperCase()) {
            notify.error(`Wrong Cart Scanned!`, {
              description: `You are working on ${cartId} but scanned a slot for ${scannedCartId}. Please scan the correct cart's position label.`
            });
            setIsProcessing(false);
            return;
          }
        }

        if (!['A', 'B', 'C', 'D', 'E', 'F'].includes(pos)) {
          notify.error(`Invalid Position: "${pos}". Scan A–F.`);
        } else if (assignments[pos].scanned) {
          notify.error(`Slot ${pos} is already filled`, { description: `Currently holding Order ${assignments[pos].orderId}` });
        } else {
          // Send instantly to backend for verification
          await scannerService.assignCartBatch(cartId, { [pos]: currentOrderId as string });
          
          setAssignments(prev => ({ ...prev, [pos]: { orderId: currentOrderId, scanned: true } }));
          setCurrentOrderId(null);
          setCurrentStep('scan-order');
          notify.success(`Order #${currentOrderId} Verified`, { description: `Successfully mapped to Slot ${pos}` });
        }
      }
    } catch (err: any) {
      notify.error("Invalid Scan", { description: err.response?.data?.message || err.message });
      // If assignment failed, they need to rescan the order entirely
      setCurrentOrderId(null);
      setCurrentStep('scan-order');
    } finally {
      setIsProcessing(false);
    }
  };

  const filledCount = Object.values(assignments).filter(a => a.scanned).length;

  useEffect(() => {
    // When all 6 are filled via instant assignment, advance immediately
    if (filledCount === 6 && !isProcessing) {
      setTimeout(() => onComplete(), 500);
    }
  }, [filledCount, isProcessing, onComplete]);

  return (
    <motion.div className="app-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '0 24px' }}>
      <header style={{ padding: '40px 0 30px' }}>
        <h1 style={{ margin: 0, fontSize: '2.4rem', fontWeight: 800 }}>Cart <span style={{ color: 'var(--primary-color)' }}>Setup</span></h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Cart: {cartId}</p>
          <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-color)' }}>{filledCount}/6</p>
        </div>
      </header>

      <form onSubmit={handleScan} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
        <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} autoFocus />
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        {['A', 'B', 'C', 'D', 'E', 'F'].map(pos => (
          <div key={pos} className="card" style={{ padding: '24px 12px', textAlign: 'center', borderColor: assignments[pos].scanned ? 'var(--primary-color)' : 'var(--border-color)', opacity: assignments[pos].scanned ? 1 : 0.6 }}>
             <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Slot {pos}</span>
             <h2 style={{ fontSize: '2.4rem', margin: '4px 0', fontWeight: 800 }}>{assignments[pos].scanned ? assignments[pos].orderId : pos}</h2>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '30px 20px', textAlign: 'center', background: 'var(--surface-accent)' }}>
        <AnimatePresence mode="wait">
          {filledCount === 6 ? (
             <div key="final" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Loader2 className="animate-spin" style={{ color: '#00ff88' }} />
                <span style={{ fontWeight: 800 }}>Finalizing Cart...</span>
             </div>
          ) : isProcessing ? (
             <div key="p" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Loader2 className="animate-spin" style={{ color: '#3b82f6' }} />
                <span style={{ fontWeight: 800 }}>Verifying Order...</span>
             </div>
          ) : currentStep === 'scan-order' ? (
             <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
               <Package size={32} style={{ color: '#00ff88', marginBottom: 12 }} />
               <h3 style={{ fontWeight: 800, margin: 0 }}>Scan Box Label</h3>
               <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>Scan box QR code to map to a slot</p>
             </motion.div>
          ) : (
             <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
               <Box size={32} style={{ color: '#3b82f6', marginBottom: 12 }} />
               <h3 style={{ fontWeight: 800, color: '#3b82f6', margin: 0 }}>Map Box {currentOrderId}</h3>
               <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>Scan Slot A–F on the trolley</p>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button onClick={onCancel} style={{ width: '100%', marginTop: 24, background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
        CANCEL AND CHOOSE DIFFERENT CART
      </button>

      <footer style={{ marginTop: 'auto', padding: '30px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
        Warehouse Scanner v1.0.0 • Professional Fulfillment
      </footer>
    </motion.div>
  );
};

export default CartAssignment;
