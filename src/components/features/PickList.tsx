'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Package, ChevronRight, CheckCircle2 } from 'lucide-react';
import notify from "@/lib/notifications";
import scannerService from "@/services/scanner.service";
import type { PickItem } from "@/interfaces";

interface LocalItemState {
  pickedQty: number;
  replacedQty?: number;
  shortQty?: number;
  items?: any[];
  replacementBarcode?: string;
  replacementProductId?: string;
}

interface PickListProps {
  cartId: string;
  pickerId: string;
  onSelectItem: (item: PickItem) => void;
  localPickedOverlay?: Record<string, LocalItemState>;
  additionalItems?: PickItem[];
  onCancelSession?: () => void;
  onSessionComplete?: (metrics: any) => void;
}

/**
 * PickList displays the sorted list of items to be picked for the current cart.
 * It manages the visual progress of the picking session and final synchronization with Airtable.
 */
const PickList: React.FC<PickListProps> = ({
  cartId,
  pickerId,
  onSelectItem,
  localPickedOverlay = {},
  additionalItems = [],
  onCancelSession,
  onSessionComplete
}) => {
  const [items, setItems] = useState<PickItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  /**
   * Loads the initial pick list from the server.
   */
  useEffect(() => {
    const fetchPickList = async () => {
      try {
        const res = await scannerService.getPickList(cartId);
        setItems(res.data);
      } catch (err: any) {
        console.error('Failed to load pick list:', err);
        notify.error('Could not load pick list. Please refresh.', {
          description: err.message
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPickList();
  }, [cartId]);

  /**
   * Finalizes the picking session by synchronizing all local state changes to Airtable.
   */
  const handleFinishCart = async (combinedItemsToSync: PickItem[]) => {
    try {
      setIsSyncing(true);
      await scannerService.syncCart(cartId, combinedItemsToSync);

      let totalP = 0;
      let totalR = 0;
      let totalS = 0;
      combinedItemsToSync.forEach(i => {
        totalP += i.pickedQty || 0;
        totalR += i.replacedQty || 0;
        totalS += i.shortQty || 0;
      });

      if (onSessionComplete) {
        onSessionComplete({
          cartId: cartId,
          teamMemberId: pickerId,
          totalItemsPacked: totalP + totalR,
          totalReplacements: totalR,
          totalShorts: totalS
        });
      }
    } catch (err: any) {
      console.error('Failed to sync logic:', err);
      notify.error('Failed to save session to Airtable', {
        description: err.message
      });
      setIsSyncing(false);
    }
  };

  /**
   * Helper to merge the server's base pick list with the locally tracked picking progress.
   */
  const allBaseItems = [...items, ...additionalItems];
  const combinedItems = allBaseItems.map(item => ({
    ...item,
    pickedQty: localPickedOverlay[item.productId]?.pickedQty ?? item.pickedQty,
    replacedQty: localPickedOverlay[item.productId]?.replacedQty ?? item.replacedQty,
    shortQty: localPickedOverlay[item.productId]?.shortQty ?? item.shortQty,
    items: localPickedOverlay[item.productId]?.items ?? item.items,
    replacementBarcode: localPickedOverlay[item.productId]?.replacementBarcode,
    replacementProductId: localPickedOverlay[item.productId]?.replacementProductId,
  }));

  if (loading || isSyncing) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ width: 40, height: 40, border: '4px solid #1e2430', borderTop: '4px solid #00ff88', borderRadius: '50%' }}
        />
        <p style={{ marginTop: 20, color: 'var(--text-secondary)' }}>
          {isSyncing ? 'Saving to Airtable...' : 'Loading Pick List...'}
        </p>
      </div>
    );
  }

  const isCardDone = (i: PickItem) => (i.pickedQty + (i.replacedQty || 0) + (i.shortQty || 0)) >= i.totalQty;
  const isAirtableDone = items.length > 0 && items.every(isCardDone);
  const completedItems = combinedItems.filter(isCardDone).length;
  const progress = combinedItems.length > 0 ? (completedItems / combinedItems.length) * 100 : 0;

  // 🛡️ NEW: Block the UI if the cart is already 100% packed in the database
  if (isAirtableDone && !isSyncing) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', textAlign: 'center', padding: 40 }}>
         <div style={{ background: '#00ff8811', border: '1px solid #00ff88', borderRadius: 24, padding: '60px 40px' }}>
            <div style={{ display: 'inline-flex', padding: 20, background: '#00ff88', borderRadius: '50%', marginBottom: 30 }}>
               <CheckCircle2 size={60} color="#0f1117" />
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 15, color: '#00ff88' }}>Cart Already Complete</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: 40, maxWidth: 400, margin: '0 auto 40px' }}>
              This cart is already marked as fully packed in Airtable.
            </p>
            <button 
              className="btn-primary" 
              style={{ width: '100%', maxWidth: 300 }}
              onClick={() => onSessionComplete?.({ cartId, teamMemberId: pickerId, totalItemsPacked: 0, totalReplacements: 0, totalShorts: 0 })}
            >
              START NEW CART
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header style={{ padding: '24px 20px 10px', background: 'var(--bg-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Pick List</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>Cart: {cartId}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            {onCancelSession && (
              <button
                onClick={onCancelSession}
                style={{ background: '#ef444422', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                CANCEL SESSION
              </button>
            )}
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-color)' }}>{completedItems}/{combinedItems.length}</span>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase' }}>Items Picked</p>
            </div>
          </div>
        </div>

        <div style={{ height: 6, background: 'var(--surface-accent)', borderRadius: 3, overflow: 'hidden', marginBottom: 20 }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            style={{ height: '100%', background: 'var(--primary-color)', boxShadow: '0 0 10px var(--primary-glow)' }}
          />
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 100px' }}>
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <h3>No items to pick</h3>
            <p>Everything is already fulfilled for this cart.</p>
          </div>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {combinedItems.map((item, index) => {
            const isDone = isCardDone(item);
            const hasReplacement = (item.replacedQty || 0) > 0;
            const hasShort = (item.shortQty || 0) > 0;

            return (
              <motion.div
                key={item.productId}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => !isDone && onSelectItem(item)}
                className="card"
                style={{
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  opacity: isDone ? 0.6 : 1,
                  background: isDone ? 'rgba(255,255,255,0.02)' : 'var(--surface-color)',
                  borderColor: isDone ? 'transparent' : 'var(--border-color)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {isDone && (
                  <div style={{ position: 'absolute', top: 10, right: 10, color: 'var(--primary-color)' }}>
                    <CheckCircle2 size={18} />
                  </div>
                )}

                <div style={{ width: 50, height: 50, background: isDone ? 'var(--surface-accent)' : '#00ff8815', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDone ? 'var(--text-dim)' : 'var(--primary-color)' }}>
                  <Package size={24} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <MapPin size={12} color="var(--text-dim)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                      {item.location}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </h3>
                </div>

                <div style={{ textAlign: 'right', paddingRight: 10 }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                    <span style={{ color: isDone ? 'var(--text-dim)' : 'var(--text-primary)' }}>{item.pickedQty}</span>
                    <span style={{ color: 'var(--text-dim)', margin: '0 2px' }}>/</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.totalQty}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Picked</p>
                  {hasReplacement && (
                    <div style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 600, marginTop: 4 }}>
                      +{item.replacedQty} REPLACED
                    </div>
                  )}
                  {hasShort && (
                    <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 600, marginTop: 4 }}>
                      +SHORT
                    </div>
                  )}
                </div>

                <ChevronRight size={18} color="var(--text-dim)" />
              </motion.div>
            );
          })}
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '20px 20px calc(20px + var(--safe-area))', background: 'linear-gradient(transparent, var(--bg-color) 30%)', pointerEvents: 'none' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', pointerEvents: 'auto', display: 'flex', gap: 10 }}>
          <button className="btn-primary" style={{ background: 'var(--surface-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.9rem', padding: '14px', flex: 1 }} onClick={() => window.location.reload()}>
            REFRESH
          </button>
          {progress >= 100 && (
            <button className="btn-primary" style={{ background: '#00ff88', color: '#000', fontSize: '0.9rem', fontWeight: 800, padding: '14px', flex: 2, boxShadow: '0 0 20px rgba(0,255,136,0.3)' }} onClick={() => handleFinishCart(combinedItems)}>
              FINISH PACKING
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PickList;
