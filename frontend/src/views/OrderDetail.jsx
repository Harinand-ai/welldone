import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { X, Printer, Mail, Check, ShieldAlert, RefreshCw, ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

function OrderDetail({ orderId, onClose }) {
  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
      fetchSettings();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.orders.get(orderId);
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const s = await api.settings.get();
      setSettings(s);
    } catch (_) {
      // ignore
    }
  };

  const handleStatusChange = async (newStatus) => {
    setError('');
    try {
      await api.orders.updateStatus(order.id, newStatus);
      setSuccess(`Status updated to "${newStatus}"`);
      fetchOrder();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    }
  };

  const handlePaymentToggle = async (newStatus) => {
    setError('');
    try {
      await api.orders.updatePayment(order.id, newStatus, order.payment_method);
      setSuccess(`Payment status updated to "${newStatus}"`);
      fetchOrder();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update payment.');
    }
  };

  const handleNotify = async () => {
    if (!order?.customer_email) {
      setError('No email address on file for this customer.');
      return;
    }
    setNotifying(true);
    setError('');
    try {
      const res = await api.orders.notify(order.id);
      setSuccess(res.message || res.warning || 'Notification sent!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to send notification.');
    } finally {
      setNotifying(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '12px', color: 'var(--text-muted)' }}>
        <RefreshCw className="animate-spin" size={24} />
        Loading order details...
      </div>
    );
  }

  if (!order) return null;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-secondary" style={{ padding: '8px 14px' }} onClick={onClose}>
            <ArrowLeft size={16} /> Back
          </button>
          <div className="page-title-desc">
            <h1>Order: {order.order_number}</h1>
            <p>Placed on {new Date(order.created_at).toLocaleString()}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={handleNotify}
            disabled={notifying || !order.customer_email}
            title={!order.customer_email ? 'No customer email on file' : 'Send pickup notification email'}
          >
            {notifying ? <RefreshCw className="animate-spin" size={16} /> : <Mail size={16} />}
            Notify Customer
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} /> Print Receipt
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: 'var(--danger)',
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px'
        }}>
          <ShieldAlert size={18} /> {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          color: 'var(--success)',
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px'
        }}>
          <Check size={18} /> {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>

        {/* Left: Order Management Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Customer Card */}
          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Customer Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Name</span>
                <span style={{ fontWeight: '600' }}>{order.customer_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Phone</span>
                <span>{order.customer_phone}</span>
              </div>
              {order.customer_email && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Email</span>
                  <span>{order.customer_email}</span>
                </div>
              )}
              {order.customer_address && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Address</span>
                  <span style={{ textAlign: 'right', maxWidth: '60%' }}>{order.customer_address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Items Card */}
          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Laundry Items</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {order.items?.map(item => (
                <div key={item.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{item.service_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {item.quantity} × ₹{parseFloat(item.unit_price).toFixed(2)}
                    </div>
                  </div>
                  <span style={{ fontWeight: '700', color: 'var(--secondary)', fontFamily: 'var(--font-heading)' }}>
                    ₹{parseFloat(item.total_price).toFixed(2)}
                  </span>
                </div>
              ))}

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-muted)' }}>
                  <span>Subtotal</span>
                  <span>₹{parseFloat(order.total_amount).toFixed(2)}</span>
                </div>
                {parseFloat(order.discount_amount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--success)' }}>
                    <span>Discount</span>
                    <span>-₹{parseFloat(order.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '18px', fontFamily: 'var(--font-heading)' }}>
                  <span>Grand Total</span>
                  <span>₹{parseFloat(order.final_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Controls Card */}
          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Update Order Status</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {['Pending', 'Delivered'].map(s => (
                <button
                  key={s}
                  className={`btn ${order.status === s ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 18px' }}
                  onClick={() => order.status !== s && handleStatusChange(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            <h3 style={{ marginBottom: '12px' }}>Payment Status</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {['Paid', 'Unpaid'].map(ps => (
                <button
                  key={ps}
                  className={`btn ${order.payment_status === ps ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 18px' }}
                  onClick={() => order.payment_status !== ps && handlePaymentToggle(ps)}
                >
                  {ps}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span>Method: <strong style={{ color: 'var(--text-main)' }}>{order.payment_method}</strong></span>
              {order.expected_delivery_date && (
                <span>Delivery by: <strong style={{ color: 'var(--text-main)' }}>{new Date(order.expected_delivery_date).toLocaleDateString()}</strong></span>
              )}
            </div>

            {order.notes && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                <strong style={{ color: 'var(--warning)' }}>Notes:</strong> {order.notes}
              </div>
            )}
          </div>
        </div>

        {/* Right: Receipt Preview */}
        <div>
          <div className="card" style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h3>80mm Receipt Preview</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
              Click "Print Receipt" to send to thermal printer
            </p>
          </div>

          <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'center' }}>
            <div className="receipt-preview" id="receipt-print-area">
              <div className="receipt-header">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Company Logo" style={{ maxHeight: '60px', margin: '0 auto 8px', display: 'block' }} />
              ) : null}
              <div className="receipt-title">{settings?.business_name || 'YES YES GROUP'}</div>
              {settings?.business_email ? <div style={{ fontSize: '10px' }}>Email: {settings.business_email}</div> : null}
              {settings?.phone ? <div style={{ fontSize: '10px' }}>Mob: {settings.phone}</div> : null}
              {settings?.address ? <div style={{ fontSize: '10px' }}>{settings.address}</div> : null}
            </div>

              <div className="receipt-divider"></div>

              <div>
                <div className="receipt-row">
                  <span>Order:</span>
                  <span style={{ fontWeight: 'bold' }}>{order.order_number}</span>
                </div>
                <div className="receipt-row">
                  <span>Date:</span>
                  <span>{new Date(order.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                {order.expected_delivery_date && (
                  <div className="receipt-row">
                    <span>Delivery:</span>
                    <span>{new Date(order.expected_delivery_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="receipt-divider"></div>

              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Customer:</div>
                <div>{order.customer_name}</div>
                <div>{order.customer_phone}</div>
              </div>

              <div className="receipt-divider"></div>

              <div className="receipt-item-list">
                <div className="receipt-row" style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  <span>Service (Qty)</span>
                  <span>Total</span>
                </div>
                {order.items?.map(item => (
                  <div key={item.id} className="receipt-row" style={{ marginBottom: '2px' }}>
                    <span>{item.service_name} ({item.quantity})</span>
                    <span>₹{parseFloat(item.total_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="receipt-divider"></div>

              <div>
                <div className="receipt-row">
                  <span>Subtotal:</span>
                  <span>₹{parseFloat(order.total_amount).toFixed(2)}</span>
                </div>
                {parseFloat(order.discount_amount) > 0 && (
                  <div className="receipt-row">
                    <span>Discount:</span>
                    <span>-₹{parseFloat(order.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="receipt-row" style={{ fontWeight: 'bold', fontSize: '13px' }}>
                  <span>Grand Total:</span>
                  <span>₹{parseFloat(order.final_amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="receipt-divider"></div>

              <div>
                <div className="receipt-row">
                  <span>Payment:</span>
                  <span>{order.payment_method} / {order.payment_status}</span>
                </div>
                <div className="receipt-row">
                  <span>Status:</span>
                  <span>{order.status}</span>
                </div>
              </div>

              {order.notes && (
                <>
                  <div className="receipt-divider"></div>
                  <div style={{ fontSize: '10px', fontStyle: 'italic' }}>Notes: {order.notes}</div>
                </>
              )}

              <div className="receipt-qr">
                {settings?.upi_id && order.payment_method === 'UPI' ? (
                  <>
                    <QRCodeSVG value={`upi://pay?pa=${encodeURIComponent(settings.upi_id)}&pn=${encodeURIComponent(settings.business_name || '')}&am=${parseFloat(order.final_amount).toFixed(2)}&tn=${encodeURIComponent(order.order_number || '')}`} size={80} level="M" />
                    <span style={{ marginTop: '6px' }}>UPI: {settings.upi_id}</span>
                  </>
                ) : (
                  <>
                    <QRCodeSVG value={order.order_number} size={80} level="M" />
                    <span>Order: {order.order_number}</span>
                  </>
                )}
              </div>

              <div className="receipt-divider" style={{ borderStyle: 'solid' }}></div>
              <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '4px' }}>
                Thank you for your business!
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default OrderDetail;
