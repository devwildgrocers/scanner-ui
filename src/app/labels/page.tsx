'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { Printer, Download, RefreshCw, Tag, Box, Calendar, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import scannerService from '@/services/scanner.service';

// ─── Types ──────────────────────────────────────────────────────────────────
type Tab = 'cart' | 'order';
type Cart = { id: string; cartId: string; status: string };
type Order = { id: string; orderNumber: string; fulfilmentDate: string };

// ─── QR Label Component ──────────────────────────────────────────────────────
const QRLabel = ({ value, title, subtitle, size = 160 }: { value: string; title: string; subtitle?: string; size?: number }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 12px',
    border: '2px dashed #2d3646',
    borderRadius: 16,
    background: '#161a22',
    gap: 10,
    breakInside: 'avoid',
    pageBreakInside: 'avoid'
  }}>
    <div style={{ background: '#fff', padding: 10, borderRadius: 10 }}>
      <QRCode value={value} size={size} level="H" />
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#f8fafc', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.02em' }}>{title}</div>
      {subtitle && <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>{subtitle}</div>}
    </div>
  </div>
);

// ─── Cart Labels Sheet ───────────────────────────────────────────────────────
const CartLabelSheet = ({ cart }: { cart: Cart }) => {
  const positions = ['A', 'B', 'C', 'D', 'E', 'F'];
  return (
    <div id="print-area" style={{ padding: 24 }}>
      {/* Cart Master Label */}
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: 280, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 12, fontSize: '0.7rem', fontWeight: 700, color: '#00ff88', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Master Cart Label
          </div>
          <QRLabel value={cart.cartId} title={cart.cartId} subtitle="Scan to start session" size={200} />
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #2d3646', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <span style={{ background: '#161a22', padding: '0 12px', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>6 Position Labels</span>
      </div>

      {/* 6 Position Labels Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {positions.map(pos => {
          const labelValue = `${cart.cartId}-${pos}`;
          return (
            <QRLabel
              key={pos}
              value={labelValue}
              title={labelValue}
              subtitle={`Slot ${pos}`}
              size={120}
            />
          );
        })}
      </div>
    </div>
  );
};

// ─── Order Labels Sheet ──────────────────────────────────────────────────────
const OrderLabelSheet = ({ orders }: { orders: Order[] }) => (
  <div id="print-area" style={{ padding: 24 }}>
    <div style={{ textAlign: 'center', marginBottom: 20 }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#00ff88', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        Order QR Labels — {orders.length} Orders
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {orders.map(order => {
        const cleanNumber = order.orderNumber.replace(/^#/, '');
        return (
          <QRLabel
            key={order.id}
            value={cleanNumber}
            title={`#${cleanNumber}`}
            subtitle="Scan to assign to slot"
            size={120}
          />
        );
      })}
    </div>
  </div>
);

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function LabelsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('cart');

  // Cart tab state
  const [carts, setCarts] = useState<Cart[]>([]);
  const [selectedCart, setSelectedCart] = useState<Cart | null>(null);
  const [cartsLoading, setCartsLoading] = useState(true);
  const [showCartSheet, setShowCartSheet] = useState(false);

  // Order tab state
  const todayString = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayString);
  const [toDate, setToDate] = useState(todayString);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [showOrderSheet, setShowOrderSheet] = useState(false);

  // Load carts on mount
  useEffect(() => {
    const loadCarts = async () => {
      try {
        const response = await scannerService.getCarts();
        // Show only Available carts for QR generation
        const availableCarts = response.data.filter((c: Cart) => c.status === 'Available');
        setCarts(availableCarts);
      } catch (error) {
        console.error('Error fetching carts:', error);
      } finally {
        setCartsLoading(false);
      }
    };
    loadCarts();

    // Set default date range to today
    const today = new Date().toISOString().split('T')[0];
    setFromDate(today);
    setToDate(today);
  }, []);

  const handlePrint = () => window.print();

  const handleFetchOrders = async () => {
    if (!fromDate || !toDate) return;
    setOrdersLoading(true);
    setOrdersError('');
    setShowOrderSheet(false);
    try {
      const res = await scannerService.getOrdersByDateRange(fromDate, toDate);
      if (res.data.length === 0) {
        setOrdersError('No orders found in this date range. Try a different range.');
      } else {
        setOrders(res.data);
        setShowOrderSheet(true);
      }
    } catch (err: any) {
      setOrdersError(err?.response?.data?.message || 'Failed to fetch orders. Check your connection.');
    } finally {
      setOrdersLoading(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'Available') return '#00ff88';
    if (s === 'Complete') return '#64748b';
    return '#f59e0b';
  };

  return (
    <>
      {/* ── Page Styles ── */}
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; filter: invert(1); }
        .print-only { display: none; }
        @page { margin: 20px 40px 20px 20px; }
        @media print {
          * { box-sizing: border-box !important; }
          body { background: white !important; margin: 0; }
          .no-print { display: none !important; }
          .print-only { display: block !important; width: 100%; page-break-inside: avoid; }
          #print-area { width: 100%; max-width: 100%; }
          #print-area div[style*="border: 2px dashed"] {
            border: 1.5px solid #999 !important;
            background: white !important;
          }
          #print-area div[style*="color: #f8fafc"] { color: #000 !important; }
          #print-area div[style*="color: #64748b"] { color: #555 !important; }
          #print-area div[style*="color: #00ff88"] { color: #000 !important; }
        }
      `}</style>

      <div className="no-print" style={{
        minHeight: '100vh',
        background: '#0c0e12',
        color: '#f8fafc',
        fontFamily: 'Inter, sans-serif',
        padding: '0 0 80px'
      }}>
        {/* Header */}
        <div style={{
          padding: '32px 24px 0',
          maxWidth: 640,
          margin: '0 auto'
        }}>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
            QR Label <span style={{ color: '#00ff88' }}>Generator</span>
          </h1>
          <p style={{ color: '#64748b', marginTop: 6, marginBottom: 32 }}>Generate and print QR labels for carts and orders</p>

          {/* Tab Switcher */}
          <div style={{
            display: 'flex',
            gap: 8,
            background: '#161a22',
            borderRadius: 14,
            padding: 6,
            marginBottom: 28,
            border: '1px solid #2d3646'
          }}>
            {([['cart', <Tag size={16} />, 'Cart Labels'], ['order', <Box size={16} />, 'Order Labels']] as const).map(([tab, icon, label]) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab as Tab); setShowCartSheet(false); setShowOrderSheet(false); }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.9rem', fontFamily: 'Inter, sans-serif',
                  background: activeTab === tab ? '#00ff88' : 'transparent',
                  color: activeTab === tab ? '#000' : '#94a3b8',
                  transition: 'all 0.2s ease'
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* ── Cart Tab ── */}
          {activeTab === 'cart' && (
            <div>
              <div style={{ background: '#161a22', border: '1px solid #2d3646', borderRadius: 20, padding: 24, marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Select Cart
                </label>
                {cartsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', padding: '12px 0' }}>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Loading carts from Airtable…</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {carts.length === 0 && (
                      <div style={{ color: '#64748b', fontSize: '0.9rem', padding: '12px 0' }}>No carts found in Airtable. Add carts via Airtable first.</div>
                    )}
                    {carts.map(cart => (
                      <button
                        key={cart.id}
                        onClick={() => { setSelectedCart(cart); setShowCartSheet(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '14px 16px', borderRadius: 12, border: `2px solid ${selectedCart?.id === cart.id ? '#00ff88' : '#2d3646'}`,
                          background: selectedCart?.id === cart.id ? 'rgba(0,255,136,0.06)' : '#1e2430',
                          color: '#f8fafc', cursor: 'pointer', transition: 'all 0.2s',
                          fontFamily: 'Inter, sans-serif'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Tag size={16} style={{ color: '#00ff88' }} />
                          <span style={{ fontWeight: 700 }}>{cart.cartId}</span>
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: statusColor(cart.status), background: 'rgba(0,0,0,0.3)', padding: '3px 10px', borderRadius: 20 }}>
                          {cart.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedCart && !showCartSheet && (
                <button
                  onClick={() => setShowCartSheet(true)}
                  style={{
                    width: '100%', padding: '16px', background: '#00ff88', color: '#000', border: 'none',
                    borderRadius: 14, fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
                    fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 8px 24px rgba(0,255,136,0.25)', transition: 'all 0.2s'
                  }}>
                  <Tag size={18} /> Generate Labels for {selectedCart.cartId}
                </button>
              )}

              {selectedCart && showCartSheet && (
                <div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    <button
                      onClick={handlePrint}
                      style={{
                        flex: 1, padding: '14px', background: '#00ff88', color: '#000', border: 'none',
                        borderRadius: 12, fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Outfit, sans-serif'
                      }}>
                      <Printer size={18} /> Print / Download PDF
                    </button>
                    <button
                      onClick={() => setShowCartSheet(false)}
                      style={{
                        padding: '14px 18px', background: '#1e2430', color: '#94a3b8', border: '1px solid #2d3646',
                        borderRadius: 12, fontWeight: 700, cursor: 'pointer'
                      }}>
                      ✕
                    </button>
                  </div>
                  <div style={{ background: '#161a22', border: '1px solid #2d3646', borderRadius: 20, overflow: 'hidden' }}>
                    <CartLabelSheet cart={selectedCart} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Order Tab ── */}
          {activeTab === 'order' && (
            <div>
              <div style={{ background: '#161a22', border: '1px solid #2d3646', borderRadius: 20, padding: 24, marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  Fulfilment Date Range
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {([['From', fromDate, setFromDate], ['To', toDate, setToDate]] as const).map(([label, value, setter]) => (
                    <div key={label as string}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>{label as string}</div>
                      <input
                        type="date"
                        value={value as string}
                        // min={todayString}
                        onChange={e => (setter as any)(e.target.value)}
                        onClick={e => {
                          try {
                            (e.target as HTMLInputElement).showPicker();
                          } catch (err) {
                            // Ignore for unsupported browsers
                          }
                        }}
                        style={{
                          width: '100%', padding: '12px', background: '#1e2430', border: '2px solid #2d3646',
                          borderRadius: 10, color: '#f8fafc', fontSize: '0.95rem', fontFamily: 'Inter, sans-serif',
                          boxSizing: 'border-box', cursor: 'pointer'
                        }}
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleFetchOrders}
                  disabled={ordersLoading || !fromDate || !toDate}
                  style={{
                    width: '100%', padding: '14px', background: ordersLoading ? '#2d3646' : '#00ff88',
                    color: ordersLoading ? '#64748b' : '#000', border: 'none', borderRadius: 12,
                    fontWeight: 800, fontSize: '0.95rem', cursor: ordersLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Outfit, sans-serif'
                  }}>
                  {ordersLoading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Fetching Orders…</> : <><Calendar size={18} /> Fetch Orders</>}
                </button>

                {ordersError && (
                  <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 10, color: '#ff4d4d', fontSize: '0.88rem' }}>
                    {ordersError}
                  </div>
                )}
              </div>

              {showOrderSheet && orders.length > 0 && (
                <div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    <button
                      onClick={handlePrint}
                      style={{
                        flex: 1, padding: '14px', background: '#00ff88', color: '#000', border: 'none',
                        borderRadius: 12, fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Outfit, sans-serif'
                      }}>
                      <Printer size={18} /> Print {orders.length} Order Labels
                    </button>
                    <button
                      onClick={() => setShowOrderSheet(false)}
                      style={{
                        padding: '14px 18px', background: '#1e2430', color: '#94a3b8', border: '1px solid #2d3646',
                        borderRadius: 12, fontWeight: 700, cursor: 'pointer'
                      }}>
                      ✕
                    </button>
                  </div>
                  <div style={{ background: '#161a22', border: '1px solid #2d3646', borderRadius: 20, overflow: 'hidden' }}>
                    <OrderLabelSheet orders={orders} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Print-only area (hidden on screen, shown only when printing) ── */}
      {showCartSheet && selectedCart && (
        <div className="print-only" style={{ display: 'none' }}>
          <CartLabelSheet cart={selectedCart} />
        </div>
      )}
      {showOrderSheet && orders.length > 0 && (
        <div className="print-only" style={{ display: 'none' }}>
          <OrderLabelSheet orders={orders} />
        </div>
      )}
    </>
  );
}
