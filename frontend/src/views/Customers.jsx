import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Search, Edit2, ShieldAlert, Check, RefreshCw, ShoppingBag, Eye } from 'lucide-react';

function Customers({ onViewOrder }) {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected Customer Order History Modal/Panel State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Edit Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const list = await api.customers.list(searchQuery);
      setCustomers(list);
    } catch (err) {
      setError('Failed to fetch customers list.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = async (cust) => {
    setSelectedCustomer(cust);
    setLoadingOrders(true);
    try {
      const orders = await api.customers.orders(cust.id);
      setCustomerOrders(orders);
    } catch (err) {
      setError('Failed to load customer order history.');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleEdit = (cust) => {
    setIsEditing(true);
    setEditingId(cust.id);
    setName(cust.name);
    setPhone(cust.phone);
    setEmail(cust.email || '');
    setAddress(cust.address || '');
    setIsActive(cust.is_active);
    setError('');
  };

  const handleReset = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setIsActive(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone) {
      setError('Name and Phone number are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name,
        phone,
        email,
        address,
        is_active: isActive
      };

      await api.customers.update(editingId, payload);
      setSuccess('Customer record updated successfully!');
      
      handleReset();
      fetchCustomers();
      setSelectedCustomer(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-desc">
          <h1>Customer Directory</h1>
          <p>Search customers, update contact records, and view complete order history</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: selectedCustomer || isEditing ? '1fr 1fr' : '1fr', gap: '24px', transition: 'var(--transition)' }}>
        
        {/* Main List Column */}
        <div className="card">
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flexGrow: 1 }}>
              <Search size={18} style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                type="text"
                placeholder="Search customers by name or phone..."
                className="form-control"
                style={{ paddingLeft: '42px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary" onClick={fetchCustomers}>
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="table-container">
            {customers.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone / Email</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: '600' }}>{c.name}</td>
                      <td>
                        <div>{c.phone}</div>
                        {c.email && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.email}</div>}
                      </td>
                      <td>
                        <span className={`badge ${c.is_active ? 'badge-delivered' : 'badge-unpaid'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleSelectCustomer(c)}
                          >
                            <ShoppingBag size={12} /> History
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleEdit(c)}
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
                No customers found.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Either Details & History or Edit Form */}
        {isEditing && (
          <div className="card">
            <h3>Edit Customer Contact</h3>
            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  className="form-control"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: '18px', height: '18px' }}
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Active Customer
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }} disabled={loading}>
                  Save Updates
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleReset}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {!isEditing && selectedCustomer && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Order History: {selectedCustomer.name}</h3>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setSelectedCustomer(null)}>
                Close
              </button>
            </div>

            {loadingOrders ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Loading order list...</p>
            ) : customerOrders.length > 0 ? (
              <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {customerOrders.map(order => (
                    <div key={order.id} style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{order.order_number}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Placed on: {new Date(order.created_at).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--secondary)', marginTop: '6px' }}>
                          ₹{parseFloat(order.final_amount).toFixed(2)} • {order.payment_method}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                          <span className={`badge ${order.payment_status === 'Paid' ? 'badge-paid' : 'badge-unpaid'}`}>
                            {order.payment_status}
                          </span>
                          <span className={`badge ${order.status === 'Pending' ? 'badge-pending' : 'badge-delivered'}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <button className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={() => onViewOrder(order.id)}>
                        <Eye size={14} /> Detail
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
                No orders placed by this customer yet.
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default Customers;
