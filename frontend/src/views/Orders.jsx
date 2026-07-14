import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Search, ShieldAlert, Check, RefreshCw, Printer, Mail, CheckCircle2 } from 'lucide-react';
import Billing from './Billing';

function Orders({ onViewOrder }) {
  const [activeTab, setActiveTab] = useState('active'); // 'new' | 'active' | 'history'
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters State
  const [statusFilter, setStatusFilter] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('oldest');
  const [notifyLoadingId, setNotifyLoadingId] = useState(null);

  useEffect(() => {
    if (activeTab === 'history') {
      setStatusFilter('Delivered');
      setSortOrder('newest');
    } else if (activeTab === 'active' && statusFilter === 'Delivered') {
      setStatusFilter('active');
      setSortOrder('oldest');
    }
  }, [activeTab]);

  useEffect(() => {
    // Only fetch orders when not in New Order tab
    if (activeTab !== 'new') fetchOrders();
  }, [statusFilter, searchQuery, sortOrder, activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const filters = { sort: sortOrder };
      const status = activeTab === 'history' ? 'Delivered' : statusFilter;
      if (status) filters.status = status;
      if (searchQuery) filters.query = searchQuery;

      const list = await api.orders.list(filters);
      setOrders(list);
    } catch (err) {
      setError('Failed to fetch orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    setLoading(true);
    setError('');
    try {
      await api.orders.updateStatus(orderId, newStatus);
      setSuccess(`Order status updated to ${newStatus}`);
      fetchOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update order status.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentStatusToggle = async (order) => {
    setLoading(true);
    setError('');
    const newStatus = order.payment_status === 'Paid' ? 'Unpaid' : 'Paid';
    const method = order.payment_method || 'Cash';

    try {
      await api.orders.updatePayment(order.id, newStatus, method);
      setSuccess(`Order payment status updated to ${newStatus}`);
      fetchOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update payment status.');
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyCustomer = async (order) => {
    if (!order.customer_email) {
      setError(`Customer ${order.customer_name} has no email address configured.`);
      setTimeout(() => setError(''), 4000);
      return;
    }

    setNotifyLoadingId(order.id);
    setError('');
    setSuccess('');
    
    try {
      const result = await api.orders.notify(order.id);
      if (result.warning) {
        setError(result.warning);
        setTimeout(() => setError(''), 5000);
      } else {
        setSuccess(result.message || 'Notification sent successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to send notification.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setNotifyLoadingId(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button className={`btn ${activeTab === 'new' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('new')}>New Order</button>
        <button className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('active')}>Active Orders</button>
        <button className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('history')}>Order History</button>
      </div>

      {activeTab === 'new' ? (
        <div>
          <Billing onOrderCreated={() => { setActiveTab('active'); fetchOrders(); }} />
        </div>
      ) : (
      <>
      <div className="page-header">
        <div className="page-title-desc">
          <h1>Order Registry</h1>
          <p>Track order progression, receive payments, print receipts, and trigger customer alerts</p>
        </div>
      </div>

      {error && (
        <div className="card" style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: 'var(--danger)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <ShieldAlert size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="card" style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          color: 'var(--success)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={18} />
          {success}
        </div>
      )}

      {/* Filters Board */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px', gap: '16px', alignItems: 'end' }}>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label>Filter Status</label>
            <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="active">Active Orders</option>
              <option value="Pending">Pending</option>
              <option value="Delivered">Delivered</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Sort By</label>
            <select className="form-control" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="oldest">FIFO (Oldest First)</option>
              <option value="newest">Newest First</option>
              <option value="delivery_asc">Delivery Time ↑</option>
              <option value="delivery_desc">Delivery Time ↓</option>
              <option value="customer_asc">Customer A-Z</option>
              <option value="customer_desc">Customer Z-A</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Search Orders</label>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                type="text"
                placeholder="Search by order #, customer name, phone number..."
                className="form-control"
                style={{ paddingLeft: '42px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <button className="btn btn-secondary" style={{ width: '100%', height: '45px' }} onClick={fetchOrders}>
            <RefreshCw size={14} /> Reload
          </button>
        </div>
      </div>

      {/* Orders Grid Table */}
      <div className="card">
        <div className="table-container">
          {orders.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer Info</th>
                  <th>Order Date</th>
                  <th>Total Amount</th>
                  <th>Payment Status</th>
                  <th>Process Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: '600' }}>{order.order_number}</td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{order.customer_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{order.customer_phone}</div>
                    </td>
                    <td>
                      <div>{new Date(order.created_at).toLocaleDateString()}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                      ₹{parseFloat(order.final_amount).toFixed(2)}
                    </td>
                    <td>
                      <button
                        onClick={() => handlePaymentStatusToggle(order)}
                        className={`badge ${order.payment_status === 'Paid' ? 'badge-paid' : 'badge-unpaid'}`}
                        style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
                        title="Click to toggle payment status"
                      >
                        {order.payment_status}
                      </button>
                    </td>
                    <td>
                      <select
                        className="form-control"
                        style={{ padding: '6px 12px', fontSize: '13px', width: '130px', height: 'auto' }}
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => onViewOrder(order.id)}
                          title="View & Print receipt"
                        >
                          <Printer size={12} /> Receipt
                        </button>
                        
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: order.customer_email ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                            color: order.customer_email ? 'var(--primary)' : 'var(--text-muted)',
                            opacity: order.customer_email ? 1 : 0.4,
                            cursor: order.customer_email ? 'pointer' : 'not-allowed'
                          }}
                          disabled={!order.customer_email || notifyLoadingId === order.id}
                          onClick={() => handleNotifyCustomer(order)}
                          title={order.customer_email ? "Send pickup email alert" : "No email configured"}
                        >
                          {notifyLoadingId === order.id ? (
                            <RefreshCw className="animate-spin" size={12} />
                          ) : (
                            <Mail size={12} />
                          )}
                          {' Notify'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>
              No orders found in database matching filters.
            </p>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}

export default Orders;
