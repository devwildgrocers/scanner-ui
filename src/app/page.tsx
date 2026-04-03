'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import SessionStart from '@/components/features/SessionStart';
import CartAssignment from '@/components/features/CartAssignment';
import PickList from '@/components/features/PickList';
import ScannerScreen from '@/components/features/ScannerScreen';
import SessionComplete from '@/components/features/SessionComplete';
import type { SessionMetrics } from '@/components/features/SessionComplete';
import notify from '@/lib/notifications';
import type { PickItem } from "@/interfaces";
import scannerService from '@/services/scanner.service';

interface LocalItemState {
  pickedQty: number;
  replacedQty?: number;
  shortQty?: number;
  items?: any[];
  replacementBarcode?: string;
  replacementProductId?: string;
}

/**
 * Utility to load state safely from localStorage with a prefix to avoid collisions.
 */
const loadLocalState = <T,>(key: string, defaultVal: T): T => {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const stored = localStorage.getItem(`scannerApp_${key}`);
    return stored ? JSON.parse(stored) : defaultVal;
  } catch {
    return defaultVal;
  }
};

/**
 * Root Application Component.
 * Orchestrates the entire warehouse picking experience, handling persistence,
 * session lifecycle, and coordinate transitions between high-level views.
 */
export default function App() {
  const [mounted, setMounted] = useState(false);
  
  // Core Session State
  const [activeSession, setActiveSession] = useState<{ 
    teamMemberId: string; 
    teamMemberName?: string;
    cartId: string; 
    active: boolean;
    initialAssignments?: Record<string, string>;
  } | null>(() => loadLocalState('session', null));
  const [isAssigning, setIsAssigning] = useState<boolean>(() => loadLocalState('isAssigning', false));
  const [selectedItem, setSelectedItem] = useState<PickItem | null>(() => loadLocalState('selectedItem', null));
  const [completedMetrics, setCompletedMetrics] = useState<SessionMetrics | null>(() => loadLocalState('metrics', null));

  // Local Picking Progress (The "Overlay")
  const [pickedItemsState, setPickedItemsState] = useState<Record<string, LocalItemState>>(() => loadLocalState('pickedItems', {}));
  const [addedReplacements, setAddedReplacements] = useState<PickItem[]>(() => loadLocalState('replacements', []));

  /**
   * Effect: Handle Hydration and lock the UI until client-side state is ready.
   * Also performs a "Background Sync" if a session is recovered from LocalStorage.
   */
  useEffect(() => {
    setMounted(true);
    
    const localSession = loadLocalState('session', null) as any;
    if (localSession?.active && localSession.teamMemberId && localSession.cartId) {
       // Validate the session with the backend to ensure real-time accuracy in case they refreshed mid-assignment
       scannerService.startSession(localSession.teamMemberId, localSession.cartId)
         .then(res => {
            if (res.data) {
                const assignmentCount = res.data.assignments ? Object.keys(res.data.assignments).length : 0;
                
                // Force jump to Pick List if the backend confirms it's fully assigned
                if (res.data.cartStatus === 'Picking' || res.data.cartStatus === 'In Progress' || assignmentCount === 6) {
                   setIsAssigning(false);
                }
                
                // Update the session state to reflect the absolute latest assignment map from the server
                setActiveSession(prev => prev ? {
                  ...prev,
                  initialAssignments: res.data.assignments
                } : null);
            }
         })
         .catch(err => console.warn("Failed to verify session on mount.", err));
    }
  }, []);

  /**
   * Effect: Persist picking progress and session data automatically to localStorage.
   */
  useEffect(() => {
    if (!mounted) return;
    
    // Always persist metrics since it might be the only state after a completed packing
    localStorage.setItem('scannerApp_metrics', JSON.stringify(completedMetrics));

    if (activeSession) {
      localStorage.setItem('scannerApp_session', JSON.stringify(activeSession));
      localStorage.setItem('scannerApp_isAssigning', JSON.stringify(isAssigning));
      localStorage.setItem('scannerApp_pickedItems', JSON.stringify(pickedItemsState));
      localStorage.setItem('scannerApp_replacements', JSON.stringify(addedReplacements));
      localStorage.setItem('scannerApp_selectedItem', JSON.stringify(selectedItem));
    } else {
        localStorage.removeItem('scannerApp_session');
        localStorage.removeItem('scannerApp_isAssigning');
        localStorage.removeItem('scannerApp_pickedItems');
        localStorage.removeItem('scannerApp_replacements');
        localStorage.removeItem('scannerApp_selectedItem');
    }
  }, [activeSession, pickedItemsState, addedReplacements, selectedItem, completedMetrics, mounted]);

  /**
   * Prepares the app for a new cart picking session, or resumes an active one.
   * Clears old cache layers to ensure no data stale from previous sessions.
   */
  const handleStartSession = (data: { 
    teamMemberId: string; 
    teamMemberName?: string;
    cartId: string; 
    cartStatus?: string;
    assignments?: Record<string, string>;
    summary?: any;
  }) => {
    setPickedItemsState({});
    setAddedReplacements([]);
    setSelectedItem(null);
    setCompletedMetrics(null);
    
    // 🟢 NEW: If cart is already complete, jump straight to Summary screen
    if (data.summary) {
        setCompletedMetrics({
          cartId: data.cartId,
          teamMemberId: data.teamMemberId,
          teamMemberName: data.teamMemberName || data.teamMemberId,
          totalItemsPacked: data.summary.totalItemsPacked,
          totalReplacements: data.summary.totalReplacements,
          totalShorts: data.summary.totalShorts,
          boxDetails: data.summary.boxDetails
        });
       setActiveSession(null); 
       notify.info('Cart Summary Loaded', { description: 'This cart was already completed.' });
       return;
    }

    // Jump straight to Pick List if cart status is already Picking/In Progress OR if 6 slots are already filled
    const assignmentCount = data.assignments ? Object.keys(data.assignments).length : 0;
    
    if (data.cartStatus === 'Picking' || data.cartStatus === 'In Progress' || assignmentCount === 6) {
      setIsAssigning(false);
      notify.success('Resuming Cart Session', { description: 'Jumping straight to the pick list.' });
    } else {
      setIsAssigning(true); 
    }
    
    setActiveSession({
      teamMemberId: data.teamMemberId,
      teamMemberName: data.teamMemberName,
      cartId: data.cartId,
      active: true,
      initialAssignments: data.assignments
    });
  };

  /**
   * Called when cart boxes are mapped to positions.
   */
  const handleAssignmentComplete = () => {
    setIsAssigning(false);
  };

  /**
   * Resets the completion state to allow a fresh cart selection (Used when naturally finishing).
   */
  const handleResetSession = () => {
    setActiveSession(null);
    setCompletedMetrics(null);
    setPickedItemsState({});
    setAddedReplacements([]);
    setSelectedItem(null);
  };

  /**
   * Hard aborts an active or partially-active session, clearing the cart in Airtable globally.
   */
  const handleAbortSession = async () => {
    if (activeSession?.cartId) {
      toast.promise(
        scannerService.cancelSession(activeSession.cartId),
        {
          loading: 'Cancelling session and releasing orders...',
          success: () => {
             handleResetSession();
             return 'Session Cancelled: Cart and Orders are available again.';
          },
          error: (err) => {
             console.warn('Failed to completely cancel cart in remote server.', err);
             // Still reset UI locally to prevent getting stuck
             handleResetSession();
             return 'Session Cancelled Locally (Airtable Update Failed)';
          }
        }
      );
    } else {
       handleResetSession();
       notify.info('Session Cancelled');
    }
  };

  /**
   * Triggers a high-importance confirmation modal before wiping session data.
   */
  const handleCancelSession = () => {
    toast.custom((t) => (
      <div style={{ 
        background: 'var(--surface-color)', 
        border: '1px solid #ef4444', 
        borderRadius: '20px', 
        padding: '28px', 
        width: '100%',
        minWidth: '340px',
        boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#ef4444', marginBottom: 14 }}>
          <AlertTriangle size={32} />
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>Wipe Session Data?</h3>
        </div>
        <p style={{ margin: '0 0 28px 0', color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.5' }}>
          This will permanently delete all picked items for this cart and remove all orders from it. This action <strong style={{ color: 'white' }}>cannot be undone</strong>.
        </p>
        <div style={{ display: 'flex', gap: 14 }}>
          <button 
            style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
            onClick={() => toast.dismiss(t)}
          >
            Keep Picking
          </button>
          <button 
            style={{ flex: 1, padding: '16px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)' }}
            onClick={() => {
              toast.dismiss(t);
              handleAbortSession();
            }}
          >
            Cancel Session
          </button>
        </div>
      </div>
    ), { 
      position: 'top-center',
      duration: Infinity 
    });
  };

  /**
   * Finalizes the local session state upon successful Airtable sync.
   */
  const handleSessionComplete = (metrics: SessionMetrics) => {
      setCompletedMetrics(metrics);
      setActiveSession(null);
  };

  /**
   * Prepares a specific item for scanning.
   * Merges existing local progress into the item metadata before opening the scanner.
   */
  const handleSelectItem = (item: PickItem) => {
    setSelectedItem({
      ...item,
      pickedQty: pickedItemsState[item.productId]?.pickedQty ?? item.pickedQty,
      replacedQty: pickedItemsState[item.productId]?.replacedQty,
      shortQty: pickedItemsState[item.productId]?.shortQty,
      items: pickedItemsState[item.productId]?.items ?? item.items
    });
  };

  /**
   * Callback for when an item's picking lifecycle is finished.
   * Updates the session progress and captures any new substitutions.
   */
  const handleScanComplete = (updatedItem: PickItem, newlyAddedReplacements: PickItem[]) => {
    setPickedItemsState(prev => ({
      ...prev,
      [updatedItem.productId]: {
        pickedQty: updatedItem.pickedQty,
        replacedQty: updatedItem.replacedQty,
        shortQty: updatedItem.shortQty,
        items: updatedItem.items
      }
    }));

    if (newlyAddedReplacements && newlyAddedReplacements.length > 0) {
      setAddedReplacements(prev => [...prev, ...newlyAddedReplacements]);
    }

    setSelectedItem(null);
  };

  // Prevent SSR flicker; ensuring a clean transition to client-hydrated state
  if (!mounted) return <div className="min-h-screen bg-[#0f1117]" />;

  return (
    <main className="min-h-screen bg-[#0f1117] text-white">
      <AnimatePresence mode="wait">
        {completedMetrics ? (
          <SessionComplete 
            key="complete" 
            metrics={completedMetrics} 
            onNewSession={handleResetSession} 
          />
        ) : !activeSession?.active ? (
          <SessionStart 
            key="start" 
            onSessionStart={handleStartSession} 
          />
        ) : (
          <motion.div 
            key="main-workflow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col min-h-screen"
          >
            {isAssigning ? (
              <CartAssignment 
                cartId={activeSession.cartId}
                initialAssignments={activeSession.initialAssignments}
                onComplete={handleAssignmentComplete}
                onCancel={handleAbortSession} 
              />
            ) : (
              <PickList 
                cartId={activeSession.cartId} 
                pickerId={activeSession.teamMemberId}
                pickerName={activeSession.teamMemberName}
                onSelectItem={handleSelectItem} 
                localPickedOverlay={pickedItemsState}
                additionalItems={addedReplacements}
                onCancelSession={handleCancelSession}
                onSessionComplete={handleSessionComplete}
                onResetSession={handleResetSession}
              />
            )}
            
            <AnimatePresence>
              {selectedItem && (
                <ScannerScreen 
                  key="scanner-overlay"
                  item={selectedItem} 
                  onBack={() => setSelectedItem(null)} 
                  onScanComplete={handleScanComplete} 
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
