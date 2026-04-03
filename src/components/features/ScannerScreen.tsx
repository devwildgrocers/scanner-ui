'use client';

import React, { useState, useRef, useEffect } from 'react';
import notify from '@/lib/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CheckCircle2, XCircle, MapPin, Package, Box, Loader2, Search, AlertCircle } from 'lucide-react';
import scannerService from "@/services/scanner.service";
import type { PickItem, Product } from "@/interfaces";

interface ScannerScreenProps {
  item: PickItem;
  onBack: () => void;
  onScanComplete: (item: PickItem, newlyAddedReplacements: PickItem[]) => void;
}

type ScanPhase = 'location' | 'qty' | 'box-original' | 'replacement-prompt' | 'replacement-select' | 'replacement-qty' | 'box-replacement';

interface FulfilledOrderMeta {
  id: string;
  fulfilled: number;
  shortQty?: number;
  status?: 'Short' | 'Replaced';
  replacementProductId?: string;
  replacedQty?: number;
}

const ScannerScreen: React.FC<ScannerScreenProps> = ({ item, onBack, onScanComplete }) => {
  const [phase, setPhase] = useState<ScanPhase>('location');
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [scanStatus, setScanStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [fulfilledOrders, setFulfilledOrders] = useState<FulfilledOrderMeta[]>([]);
  const [currentOrderMeta, setCurrentOrderMeta] = useState<Partial<FulfilledOrderMeta>>({});
  const [qtyInput, setQtyInput] = useState<number | ''>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReplacementId, setSelectedReplacementId] = useState('');
  const [replacementQtyInput, setReplacementQtyInput] = useState<number | ''>('');

  const inputRef = useRef<HTMLInputElement>(null);

  const groupedOrders = React.useMemo(() => {
    const map = new Map<string, { orderNumber: string; qty: number; ids: string[] }>();
    item.items.forEach(line => {
      if (!map.has(line.orderNumber)) {
        map.set(line.orderNumber, { orderNumber: line.orderNumber, qty: 0, ids: [] });
      }
      const group = map.get(line.orderNumber)!;
      group.qty += line.qty;
      group.ids.push(line.id);
    });
    return Array.from(map.values());
  }, [item.items]);

  const currentGroup = groupedOrders[currentOrderIndex];

  useEffect(() => {
    const handleFocus = () => {
      if (['location', 'box-original', 'box-replacement'].includes(phase)) {
        inputRef.current?.focus();
      }
    };
    handleFocus();
    window.addEventListener('click', handleFocus);
    return () => window.removeEventListener('click', handleFocus);
  }, [phase]);

  useEffect(() => {
    if (phase === 'qty' && currentGroup) {
      if (item.isReplacement) {
        setQtyInput(currentGroup.qty);
        setPhase('box-replacement');
      } else {
        setQtyInput(currentGroup.qty);
      }
    }
  }, [phase, currentGroup]);

  useEffect(() => {
    if ((phase === 'replacement-prompt' || phase === 'replacement-select') && products.length === 0) {
      setIsLoadingProducts(true);
      scannerService.getProducts()
        .then((res: any) => {
          setProducts(res.data);
          setIsLoadingProducts(false);
        })
        .catch(err => {
          console.error(err);
          setIsLoadingProducts(false);
          notify.error("Failed to load products");
        });
    }
  }, [phase, products.length]);

  const finishCurrentOrder = (newMeta: Partial<FulfilledOrderMeta>) => {
    const finalMeta = { ...currentOrderMeta, ...newMeta };
    let remainingToDistribute = Number(qtyInput);
    let remainingSubToDistribute = finalMeta.replacedQty ?? 0;
    const newFulfilledItems: FulfilledOrderMeta[] = [];

    // Distribute quantity across original line items
    for (let i = 0; i < currentGroup.ids.length; i++) {
      const rawId = currentGroup.ids[i];
      const rawItem = item.items.find(j => j.id === rawId)!;
      const assignedToThisRow = Math.min(rawItem.qty, remainingToDistribute);
      remainingToDistribute -= assignedToThisRow;

      const diffAmt = rawItem.qty - assignedToThisRow;
      let shortQtyRow = 0;
      let replacedQtyRow = 0;

      if (finalMeta.status === 'Replaced') {
         replacedQtyRow = Math.min(diffAmt, remainingSubToDistribute);
         remainingSubToDistribute -= replacedQtyRow;
         
         if (i === currentGroup.ids.length - 1 && remainingSubToDistribute > 0) {
           replacedQtyRow += remainingSubToDistribute;
           remainingSubToDistribute = 0;
         }
         
         shortQtyRow = Math.max(0, diffAmt - replacedQtyRow);
      } else if (finalMeta.status === 'Short') {
         shortQtyRow = diffAmt;
      }

      newFulfilledItems.push({
        ...finalMeta,
        id: rawId,
        fulfilled: assignedToThisRow,
        shortQty: shortQtyRow,
        replacedQty: replacedQtyRow
      });
    }

    const newFulfilledOrders = [...fulfilledOrders, ...newFulfilledItems];
    setFulfilledOrders(newFulfilledOrders);
    setCurrentOrderMeta({});
    setSelectedReplacementId('');

    const nextIndex = currentOrderIndex + 1;
    if (nextIndex < groupedOrders.length) {
      setCurrentOrderIndex(nextIndex);
      setPhase('qty');
    } else {
      processOverallCompletion(newFulfilledOrders);
    }
  };

  const processOverallCompletion = (finalOrders: FulfilledOrderMeta[]) => {
    let totalPicked = 0;
    let totalReplaced = 0;
    let totalShort = 0;
    const generatedReplacements: PickItem[] = [];
    const repMap = new Map<string, { totalRQty: number, lines: any[] }>();

    const updatedLines = item.items.map(orig => {
      const f = finalOrders.find(fo => fo.id === orig.id);
      if (f) {
        totalPicked += f.fulfilled;
        if (f.status === 'Replaced' || f.status === 'Short') {
          totalShort += f.shortQty || 0;
          totalReplaced += f.replacedQty || 0;
          if (f.status === 'Replaced' && f.replacementProductId && f.replacedQty) {
            if (!repMap.has(f.replacementProductId)) {
               repMap.set(f.replacementProductId, { totalRQty: 0, lines: [] });
            }
            const g = repMap.get(f.replacementProductId)!;
            g.totalRQty += f.replacedQty;
            g.lines.push({
               id: `genrepl-${orig.id}-${Date.now()}`,
               orderNumber: orig.orderNumber,
               qty: f.replacedQty,
               fulfilled: 0
            });
          }
        }
        return { ...orig, fulfilled: f.fulfilled, shortQty: f.shortQty, replacedQty: f.replacedQty, status: f.status, replacementProductId: f.replacementProductId };
      }
      return orig;
    });

    repMap.forEach((data, repId) => {
      const repProd = products.find(p => p.id === repId);
      generatedReplacements.push({
        productId: `repl-task-${Date.now()}-${repId}`,
        originalProductId: item.productId,
        isReplacement: true,
        name: `[SUB] ${repProd?.name || 'Replacement Product'}`,
        location: repProd?.location || 'ZZZZ-Unknown',
        totalQty: data.totalRQty,
        pickedQty: 0,
        items: data.lines
      });
    });

    const updatedItem: PickItem = {
      ...item,
      pickedQty: item.pickedQty + totalPicked,
      replacedQty: (item.replacedQty || 0) + totalReplaced,
      shortQty: (item.shortQty || 0) + totalShort,
      items: updatedLines
    };

    onScanComplete(updatedItem, generatedReplacements);
  };

  /**
   * Primary input parsing machine for capturing scanner hardware events.
   * Based on the active `phase`, this validates either location barcodes or Order IDs.
   */
  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const scannedCode = inputValue.trim();
    if (!scannedCode || scanStatus === 'processing') return;

    setScanStatus('processing');
    setInputValue('');

    setTimeout(() => {
      if (phase === 'location') {
        const isMatch = scannedCode.toLowerCase() === item.location.toLowerCase() || item.isReplacement;
        if (isMatch) showScanSuccess(() => setPhase('qty'));
        else showScanError(`Location Mismatch: "${scannedCode}"`);
      }
      else if (phase === 'replacement-select') {
        const matched = products.find(p => p.barcode === scannedCode || p.id === scannedCode);
        if (matched) {
          showScanSuccess(() => {
            setSelectedReplacementId(matched.id);
            // Defintive 1:1 or 3:1 ratio logic - finishes immediately WITHOUT second box scan
            const remainingQty = Math.max(1, currentGroup.qty - Number(qtyInput));
            finishCurrentOrder({ 
              status: 'Replaced', 
              replacementProductId: matched.id, 
              replacedQty: remainingQty 
            });
          });
        } else {
          showScanError(`Product Not Found: "${scannedCode}"`);
        }
      }
      else if (phase === 'box-original' || phase === 'box-replacement') {
        const cleanScanned = scannedCode.replace(/^#+/, '').toLowerCase();
        const cleanActual = currentGroup.orderNumber.replace(/^#+/, '').toLowerCase();

        const isMatch = (cleanScanned === cleanActual);

        if (isMatch) {
          showScanSuccess(() => {
            if (phase === 'box-original') {
              if (Number(qtyInput) < currentGroup.qty) setPhase('replacement-prompt');
              else finishCurrentOrder({});
            }
            else if (phase === 'box-replacement') {
              // Now uses the manual replacementQtyInput value for non-1:1 ratios
              finishCurrentOrder({ 
                status: 'Replaced', 
                replacementProductId: selectedReplacementId, 
                replacedQty: Number(replacementQtyInput) 
              });
            }
          });
        } else {
          showScanError(`Wrong Box: Expected Order #${currentGroup.orderNumber}`);
        }
      }
    }, 500);
  };

  /**
   * Triggers the UI success animation before firing the provided callback to advance the scanner state.
   */
  const showScanSuccess = (callback: () => void) => {
    setScanStatus('success');
    setErrorMessage('');
    setTimeout(() => {
      setScanStatus('idle');
      callback();
    }, 600);
  };

  /**
   * Triggers the UI error shake animation and displays the mismatch message.
   */
  const showScanError = (msg: string) => {
    setScanStatus('error');
    setErrorMessage(msg);
    setTimeout(() => setScanStatus('idle'), 2500);
  };

  /**
   * Captures the physical number of products the picker secured for this order.
   * If they confirm an amount lower than required, triggers the shortage/replacement workflow.
   */
  const handleConfirmQty = (e: React.FormEvent) => {
    e.preventDefault();
    if (qtyInput === '' || Number(qtyInput) < 0) return notify.warning('Please enter valid quantity');
    if (Number(qtyInput) === 0) setPhase('replacement-prompt');
    else setPhase('box-original');
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      style={{ position: 'fixed', inset: 0, background: 'var(--bg-color)', zIndex: 100, display: 'flex', flexDirection: 'column' }}
    >
      <form onSubmit={handleScan} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
        <input 
          ref={inputRef} 
          type="text" 
          value={inputValue} 
          onChange={e => setInputValue(e.target.value)} 
          autoComplete="off" 
          autoFocus 
          inputMode="none"
        />
      </form>

      <header style={{ padding: '20px', background: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 15 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', padding: 8 }}>
          <ChevronLeft size={28} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Shelf-to-Box Scan</h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {phase === 'location' ? 'Step 1: Verify Location' : phase === 'qty' ? `Confirm Qty (Order ${currentGroup?.orderNumber})` : `Step 2: Pack to Order ${currentGroup?.orderNumber}`}
          </p>
        </div>
      </header>

      <div style={{ flex: 1, padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflowY: 'auto' }}>

        <AnimatePresence mode="wait">
          {scanStatus === 'processing' ? (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, backdropFilter: 'blur(10px)' }}>
              <div style={{ position: 'relative', width: 120, height: 120 }}>
                <Loader2 size={120} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box size={40} style={{ color: 'var(--primary-color)', opacity: 0.5 }} />
                </div>
              </div>
              <p style={{ fontWeight: 900, fontSize: '1.8rem', color: 'white', letterSpacing: '0.2em' }}>VERIFYING...</p>
            </motion.div>
          ) : scanStatus === 'success' ? (
            <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0,255,136,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, backdropFilter: 'blur(20px)' }}>
              <CheckCircle2 size={120} style={{ color: '#00ff88' }} />
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#00ff88' }}>MATCHED!</span>
            </motion.div>
          ) : scanStatus === 'error' ? (
            <motion.div key="error" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(239, 68, 68, 0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center', padding: 40, backdropFilter: 'blur(20px)' }}>
              <XCircle size={120} style={{ color: '#ef4444' }} />
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ef4444' }}>REJECTED</span>
              <p style={{ maxWidth: 400, fontSize: '1.2rem', color: 'white', fontWeight: 600 }}>{errorMessage}</p>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

              {phase === 'location' && (
                <>
                  <div style={{ width: 100, height: 100, background: '#f59e0b22', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', marginBottom: 30 }}>
                    <MapPin size={50} />
                  </div>
                  <div className="card" style={{ padding: 30, width: '100%', maxWidth: 400, textAlign: 'center', border: '3px dashed #f59e0b', background: '#f59e0b05', position: 'relative', overflow: 'hidden' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Target Shelf</p>
                    <p style={{ margin: '10px 0 0', fontSize: '3.5rem', fontWeight: 900, color: '#f59e0b' }}>{item.location}</p>
                    <div style={{ height: 2, background: '#f59e0b', width: '100%', position: 'absolute', top: 0, left: 0, animation: 'beamSweep 2s linear infinite' }} />
                  </div>
                  {item.isReplacement && (
                     <button type="button" onClick={() => showScanSuccess(() => setPhase('qty'))} className="btn-primary" style={{ marginTop: 20, background: '#f59e0b', padding: '15px 30px', fontSize: '1rem', width: '100%', maxWidth: 400 }}>BYPASS LOCATION SCAN</button>
                  )}
                  <p style={{ marginTop: 40, color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 700 }}>VERIFYING LOCATION...</p>
                  {item.isReplacement && (
                    <div style={{ marginTop: 20, padding: '12px 20px', background: '#3b82f615', border: '1px solid #3b82f640', borderRadius: 12, color: '#3b82f6', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}>
                      FORCED REPLACEMENT: MUST PACK {item.totalQty} UNITS
                    </div>
                  )}
                </>
              )}

              {phase === 'qty' && currentGroup && (
                <form onSubmit={handleConfirmQty} style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 100, height: 100, background: '#00ff8822', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00ff88', marginBottom: 30 }}>
                    <Package size={50} />
                  </div>
                  <h3 style={{ fontSize: '1.8rem', textAlign: 'center', margin: '0 0 10px 0', fontWeight: 900 }}>{item.name}</h3>
                  
                  <div style={{ background: '#3b82f622', color: '#3b82f6', border: '1px solid #3b82f6', padding: '6px 16px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, marginBottom: 5 }}>
                    Order {currentGroup.orderNumber.startsWith('#') ? currentGroup.orderNumber : `#${currentGroup.orderNumber}`}
                  </div>
                  
                  {groupedOrders.length > 1 && (
                    <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: 25, fontWeight: 700 }}>
                      (Box {currentOrderIndex + 1} of {groupedOrders.length})
                    </p>
                  )}
                  {groupedOrders.length <= 1 && <div style={{ marginBottom: 30 }} />}

                  <div className="card" style={{ padding: 30, width: '100%', marginBottom: 30, textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                      <button
                        type="button"
                        onClick={() => setQtyInput(prev => Math.max(0, (Number(prev) || 0) - 1))}
                        style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid var(--border-color)', background: 'var(--surface-color)', color: 'white', fontSize: '2rem', fontWeight: 900 }}
                      >
                        -
                      </button>

                      <input
                        type="number"
                        autoFocus
                        value={qtyInput}
                        onChange={(e) => setQtyInput(e.target.value === '' ? '' : Math.min(Number(e.target.value), currentGroup.qty))}
                        style={{ width: '120px', padding: '15px 5px', fontSize: '3rem', textAlign: 'center', borderRadius: 16, border: '2px solid var(--primary-color)', background: '#000', color: 'white', fontWeight: 900 }}
                      />

                      <button
                        type="button"
                        onClick={() => setQtyInput(prev => Math.min(currentGroup.qty, (Number(prev) || 0) + 1))}
                        style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid var(--primary-color)', background: 'var(--primary-color)', color: '#000', fontSize: '2rem', fontWeight: 900 }}
                      >
                        +
                      </button>
                    </div>
                    <p style={{ margin: '20px 0 0', opacity: 0.6, fontSize: '1.1rem' }}>Original Requirement: {currentGroup.qty}</p>
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: '100%', padding: '20px', fontSize: '1.2rem', fontWeight: 900 }}>CONTINUE</button>
                </form>
              )}

              {phase === 'replacement-prompt' && currentGroup && (
                <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 80, height: 80, background: '#ef444422', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: 20 }}>
                    <AlertCircle size={40} />
                  </div>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: 10 }}>Quantity Short</h3>
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 30 }}>
                    Remaining: **{currentGroup.qty - Number(qtyInput)} units**
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 15, width: '100%' }}>
                    {!item.isReplacement && (
                      <button className="btn-primary" style={{ padding: '20px', background: '#3b82f6', color: 'white' }} onClick={() => setPhase('replacement-select')}>SUBSTITUTE PRODUCT</button>
                    )}
                    <button className="btn-primary" style={{ padding: '20px', background: '#ef4444', color: 'white' }} onClick={() => finishCurrentOrder({ status: 'Short' })}>MARK AS SHORT</button>
                  </div>
                </div>
              )}

              {phase === 'replacement-select' && (
                <div style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ position: 'relative', marginBottom: 20 }}>
                    <Search style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input
                      type="text"
                      placeholder="Search Replacement..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '15px 15px 15px 45px', borderRadius: 12, background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'white' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {isLoadingProducts ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, gap: 15 }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>Loading Products...</p>
                      </div>
                    ) : (
                      filteredProducts.map(p => (
                        <div key={p.id} className="card" style={{ padding: 15, cursor: 'pointer', border: selectedReplacementId === p.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)' }} onClick={() => {
                          setSelectedReplacementId(p.id);
                          setReplacementQtyInput(Math.max(1, currentGroup.qty - Number(qtyInput)));
                          setPhase('replacement-qty');
                        }}>
                          <p style={{ margin: 0, fontWeight: 700 }}>{p.name}</p>
                        </div>
                      ))
                    )}
                    {!isLoadingProducts && filteredProducts.length === 0 && (
                      <div style={{ textAlign: 'center', padding: 20 }}>
                        <p style={{ color: 'var(--text-dim)' }}>No products found</p>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setPhase('replacement-prompt')} style={{ marginTop: 20, color: 'var(--text-secondary)', background: 'none', border: 'none' }}>Go Back</button>
                </div>
              )}

              {phase === 'replacement-qty' && currentGroup && (
                <form onSubmit={(e) => { 
                   e.preventDefault();
                   if (Number(replacementQtyInput) < 1) {
                     notify.error("Replacement quantity must be at least 1.");
                     return;
                   }
                   // NO MORE DOUBLE SCAN - if box was already verified for original part, just finish.
                   finishCurrentOrder({ 
                     status: 'Replaced', 
                     replacementProductId: selectedReplacementId, 
                     replacedQty: Number(replacementQtyInput) 
                   });
                }} style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 100, height: 100, background: '#3b82f622', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', marginBottom: 30 }}>
                    <Package size={50} />
                  </div>
                  <h3 style={{ fontSize: '1.8rem', textAlign: 'center', margin: '0 0 10px 0', fontWeight: 900 }}>Sub Quantity</h3>
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 40 }}>How many replacements dropping into box?</p>

                  <div className="card" style={{ padding: 30, width: '100%', marginBottom: 30, textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                      <button
                        type="button"
                        onClick={() => setReplacementQtyInput(prev => Math.max(1, (Number(prev) || 0) - 1))}
                        style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid var(--border-color)', background: 'var(--surface-color)', color: 'white', fontSize: '2rem', fontWeight: 900 }}
                      >
                        -
                      </button>

                      <input
                        type="number"
                        autoFocus
                        value={replacementQtyInput}
                        onChange={(e) => setReplacementQtyInput(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                        style={{ width: '120px', padding: '15px 5px', fontSize: '3rem', textAlign: 'center', borderRadius: 16, border: '2px solid #3b82f6', background: '#000', color: 'white', fontWeight: 900 }}
                      />

                      <button
                        type="button"
                        onClick={() => setReplacementQtyInput(prev => (Number(prev) || 0) + 1)}
                        style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid #3b82f6', background: '#3b82f6', color: '#000', fontSize: '2rem', fontWeight: 900 }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: '100%', padding: '20px', fontSize: '1.2rem', fontWeight: 900, background: '#3b82f6' }}>CONFIRM SUBSTITUTION</button>
                </form>
              )}

              {(phase === 'box-original' || phase === 'box-replacement') && currentGroup && (
                <>
                  <div style={{ width: 100, height: 100, background: '#3b82f622', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', marginBottom: 30 }}>
                    <Box size={50} />
                  </div>
                  <div className="card" style={{ padding: 30, width: '100%', maxWidth: 400, textAlign: 'center', border: '3px solid #3b82f6', background: '#3b82f605', position: 'relative', overflow: 'hidden' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Destination Box</p>
                    <p style={{ margin: '10px 0 0', fontSize: '3.5rem', fontWeight: 900, color: '#3b82f6' }}>{currentGroup.orderNumber.startsWith('#') ? currentGroup.orderNumber : `#${currentGroup.orderNumber}`}</p>
                    <div style={{ height: 2, background: '#3b82f6', width: '100%', position: 'absolute', top: 0, left: 0, animation: 'beamSweep 2s linear infinite' }} />
                  </div>
                  <p style={{ marginTop: 40, color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 700 }}>VERIFYING ORDER SLOT...</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes beamSweep {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(120px); opacity: 0; }
        }
      `}</style>
    </motion.div>
  );
};

export default ScannerScreen;
