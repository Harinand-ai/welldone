import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Search, UserPlus, Trash2, ShieldAlert, Check, Printer, X, Plus, Minus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

function Billing({ onOrderCreated }) {
  // Services & Cart State
  const [services, setServices] = useState([]);
  const [cart, setCart] = useState([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  
  // Customer Search & Creation State
  const [phoneSearch, setPhoneSearch] = useState('');
  const [customer, setCustomer] = useState(null);
  const [isNewCustomerMode, setIsNewCustomerMode] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Order Settings State
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('fixed');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [deliveryMethod, setDeliveryMethod] = useState('Pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  
  // Turnaround: default 2 days from now
  const getDefaultDeliveryDate = (hours = 48) => {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    return d.toISOString().split('T')[0];
  };
  const [deliveryDate, setDeliveryDate] = useState(getDefaultDeliveryDate());

  // UI Flow State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdOrderDetails, setCreatedOrderDetails] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetchServices();
    // load settings from backend
    (async () => {
      try {
        const s = await api.settings.get();
        setSettings(s || {});
        if (s?.default_delivery_hours) {
          setDeliveryDate(getDefaultDeliveryDate(s.default_delivery_hours));
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const fetchServices = async () => {
    try {
      // Cashiers get active services; owners get all
      const list = await api.services.list();
      setServices(list.filter(s => s.is_active));
    } catch (err) {
      setError('Failed to load laundry services.');
    }
  };

  const filteredServices = services.filter((s) => {
    const query = serviceSearch.trim().toLowerCase();
    const matchesCategory = !serviceCategory || s.category === serviceCategory;
    if (!query) {
      return matchesCategory;
    }
    return matchesCategory && [s.name, s.description, s.category, s.keywords]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  const serviceCategories = Array.from(new Set(services.map((s) => s.category).filter(Boolean))).sort();

  const handleCustomerSearch = async () => {
    if (!phoneSearch) return;
    setError('');
    setCustomer(null);
    setIsNewCustomerMode(false);
    
    try {
      const cust = await api.customers.lookup(phoneSearch);
      setCustomer(cust);
      if (cust.address) setDeliveryAddress(cust.address);
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('404')) {
        // Customer not found, toggle creation mode
        setIsNewCustomerMode(true);
        setNewCustName('');
        setNewCustEmail('');
        setNewCustAddress('');
      } else {
        setError(err.message || 'Lookup failed.');
      }
    }
  };

  // Trigger search if phone reaches 10 digits
  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, ''); // digits only
    setPhoneSearch(val);
    if (val.length === 10) {
      // Small timeout or immediate lookup
      setTimeout(() => {
        setPhoneSearch(prev => {
          if (prev === val) handleCustomerSearch();
          return prev;
        });
      }, 300);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName || !phoneSearch) {
      setError('Name and Phone are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const newCust = await api.customers.create({
        name: newCustName,
        phone: phoneSearch,
        email: newCustEmail,
        address: newCustAddress
      });
      setCustomer(newCust);
      setDeliveryAddress(newCustAddress || '');
      setIsNewCustomerMode(false);
      setSuccess('Customer created successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to create customer.');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (service) => {
    setCart(prev => {
      const existing = prev.find(item => item.service_id === service.id);
      if (existing) {
        return prev.map(item =>
          item.service_id === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        service_id: service.id,
        name: service.name,
        unit_price: parseFloat(service.price),
        quantity: 1
      }];
    });
  };

  const updateCartQty = (serviceId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.service_id === serviceId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (serviceId) => {
    setCart(prev => prev.filter(item => item.service_id !== serviceId));
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  };

  const getDiscountAmount = (subtotal) => {
    const value = parseFloat(discount || 0);
    if (!value || value <= 0) return 0;
    if (discountType === 'percent') {
      return Math.min(subtotal, (subtotal * value) / 100);
    }
    return Math.min(subtotal, value);
  };

  const getFinalTotal = () => {
    const sub = getSubtotal();
    const disc = getDiscountAmount(sub);
    return Math.max(0, sub - disc);
  };

  const handleCheckout = async () => {
    if (!customer) {
      setError('Please search and select a customer first.');
      return;
    }
    if (cart.length === 0) {
      setError('Your billing cart is empty.');
      return;
    }
    if (deliveryMethod === 'Delivery' && !deliveryAddress) {
      setError('Enter the delivery address for home pickup.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const subtotal = getSubtotal();
      const finalDiscount = getDiscountAmount(subtotal);

      const orderPayload = {
        customer_id: customer.id,
        items: cart.map(item => ({
          service_id: item.service_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        discount_amount: finalDiscount,
        payment_method: paymentMethod,
        payment_status: 'Unpaid',
        notes: notes,
        expected_delivery_date: deliveryDate,
        delivery_method: deliveryMethod,
        delivery_address: deliveryMethod === 'Delivery' ? deliveryAddress : null
      };

      const result = await api.orders.create(orderPayload);
      const fullOrder = await api.orders.get(result.id);
      setCreatedOrderDetails(fullOrder);
      setShowReceiptModal(true);

      // Reset POS
      setCart([]);
      setDiscount(0);
      setNotes('');
      setPhoneSearch('');
      setCustomer(null);
      setDeliveryAddress('');
      setDeliveryDate(getDefaultDeliveryDate());

      if (onOrderCreated) {
        onOrderCreated();
      }
    } catch (err) {
      setError(err.message || 'Failed to place order.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadInvoice = async (format = 'a4') => {
    if (!createdOrderDetails) return;
    try {
      const blob = await api.orders.getInvoicePdf(createdOrderDetails.id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${createdOrderDetails.order_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || 'Failed to download invoice PDF');
    }
  };

  const printInvoice = async (format = 'a4') => {
    if (!createdOrderDetails) return;
    try {
      const blob = await api.orders.getInvoicePdf(createdOrderDetails.id, format);
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      // Attempt to trigger print after load
      w.onload = () => { try { w.print(); } catch (e) { /* ignore */ } };
    } catch (e) {
      alert(e.message || 'Failed to generate invoice for printing');
    }
  };

  const shareInvoiceWhatsApp = async (format = 'a4') => {
    if (!createdOrderDetails) return;
    try {
      // Generate PDF blob
      const blob = await api.orders.getInvoicePdf(createdOrderDetails.id, format);

      // Create a blob URL so the user can download/attach it manually
      const url = URL.createObjectURL(blob);

      // Prepare message
      const business = settings?.business_name || '';
      const custName = createdOrderDetails.customer_name || '';
      const orderNo = createdOrderDetails.order_number || '';
      const amount = parseFloat(createdOrderDetails.final_amount).toFixed(2);
      const delivery = createdOrderDetails.expected_delivery_date ? new Date(createdOrderDetails.expected_delivery_date).toLocaleDateString() : '';

      const message = `Invoice from ${business}%0A\nCustomer: ${custName}%0AOrder: ${orderNo}%0ATotal: ₹${amount}%0ADelivery: ${delivery}%0A\nThank you!`;

      // Open PDF in new tab for download
      window.open(url, '_blank');

      // Construct WhatsApp URL
      const phone = createdOrderDetails.customer_phone ? createdOrderDetails.customer_phone.replace(/\D/g, '') : '';
      let waUrl = '';
      if (phone) {
        // wa.me supports international format without +, but we cannot reliably format; use as provided
        waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      } else {
        // Open WhatsApp web with message (no number)
        waUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      }

      window.open(waUrl, '_blank');

      // Inform user to attach the downloaded PDF in WhatsApp if their client doesn't allow direct attachments
      alert('WhatsApp opened in a new tab. If your client does not allow attaching files automatically, please download the invoice PDF from the opened tab and attach it manually in the WhatsApp chat.');
    } catch (e) {
      alert(e.message || 'Failed to prepare invoice for WhatsApp sharing');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-desc">
          <h1>New Order & Billing</h1>
          <p>Quick POS screen for laundry booking and receipt printing</p>
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

      <div className="billing-layout">
        {/* Left Side: Customer & Laundry Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Customer Search Card */}
          <div className="card">
            <h3>1. Customer Lookup</h3>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', marginBottom: '12px' }}>
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
                  placeholder="Enter 10-digit mobile number..."
                  className="form-control"
                  style={{ paddingLeft: '42px' }}
                  value={phoneSearch}
                  onChange={handlePhoneChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomerSearch()}
                />
              </div>
              <button className="btn btn-secondary" onClick={handleCustomerSearch}>
                Lookup
              </button>
            </div>

            {/* Existing Customer Selected info */}
            {customer && !isNewCustomerMode && (
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                border: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ fontWeight: '600' }}>{customer.name}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {customer.phone} {customer.email ? `• ${customer.email}` : ''}
                  </p>
                  {customer.address && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Addr: {customer.address}
                    </p>
                  )}
                </div>
                <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setCustomer(null)}>
                  Change
                </button>
              </div>
            )}

            {/* New Customer Form */}
            {isNewCustomerMode && (
              <form onSubmit={handleCreateCustomer} style={{
                backgroundColor: 'rgba(99, 102, 241, 0.02)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: '1px dashed rgba(99, 102, 241, 0.2)',
                marginTop: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--primary)' }}>
                  <UserPlus size={18} />
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>New Customer Registration</span>
                </div>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter name"
                    className="form-control"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="customer@domain.com"
                      className="form-control"
                      value={newCustEmail}
                      onChange={(e) => setNewCustEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Address (Optional)</label>
                    <input
                      type="text"
                      placeholder="Residential address"
                      className="form-control"
                      value={newCustAddress}
                      onChange={(e) => setNewCustAddress(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }} disabled={loading}>
                    Register & Select
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '8px 16px' }} onClick={() => setIsNewCustomerMode(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Laundry Services Catalog */}
          <div className="card">
            <h3>2. Select Laundry Services</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-control"
                  style={{ paddingLeft: '42px' }}
                  placeholder="Search services by name, category, or keyword..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                />
              </div>
              <div style={{ minWidth: '220px' }}>
                <select
                  className="form-control"
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {serviceCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="items-grid">
              {filteredServices.length > 0 ? filteredServices.map((s) => (
                <div key={s.id} className="service-item-card" onClick={() => addToCart(s)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span className="service-name-tag">{s.name}</span>
                    <span className="service-price-tag">₹{parseFloat(s.price).toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: '11px', marginTop: '6px', color: 'var(--text-muted)' }}>
                    {s.category}
                    {s.keywords ? ` • ${s.keywords.split(',').slice(0, 3).join(', ')}` : ''}
                  </div>
                </div>
              )) : (
                <div style={{ color: 'var(--text-muted)', padding: '24px', width: '100%', textAlign: 'center' }}>
                  No services found. Adjust search or category filters.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Cart Summary & Checkout */}
        <div className="card cart-summary">
          <h3>Billing Cart</h3>
          
          {cart.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                {cart.map(item => (
                  <div key={item.service_id} className="cart-item-row">
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>{item.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        ₹{item.unit_price.toFixed(2)} each
                      </div>
                    </div>
                    <div className="cart-item-qty-control">
                      <button className="qty-btn" onClick={() => updateCartQty(item.service_id, -1)}>
                        <Minus size={12} />
                      </button>
                      <span style={{ fontWeight: '600', fontSize: '14px', minWidth: '20px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button className="qty-btn" onClick={() => updateCartQty(item.service_id, 1)}>
                        <Plus size={12} />
                      </button>
                      <button className="logout-btn" style={{ marginLeft: '12px' }} onClick={() => removeFromCart(item.service_id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="totals-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700' }}>Discount & Totals</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Apply discount after selecting services.</div>
                  </div>
                </div>

                <div className="total-row">
                  <span>Subtotal</span>
                  <span>₹{getSubtotal().toFixed(2)}</span>
                </div>

                <div className="form-group" style={{ margin: '8px 0 4px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <button
                      type="button"
                      className={`btn ${discountType === 'fixed' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '8px 14px' }}
                      onClick={() => setDiscountType('fixed')}
                    >
                      Fixed
                    </button>
                    <button
                      type="button"
                      className={`btn ${discountType === 'percent' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '8px 14px' }}
                      onClick={() => setDiscountType('percent')}
                    >
                      Percentage
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginRight: '12px' }}>
                      Discount {discountType === 'percent' ? '(%)' : '(₹)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={discountType === 'percent' ? '100' : undefined}
                      className="form-control"
                      style={{ width: '110px', padding: '8px 10px', fontSize: '14px', textAlign: 'right' }}
                      value={discount}
                      onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>

                <div className="total-row">
                  <span>Discount Amount</span>
                  <span>-₹{getDiscountAmount(getSubtotal()).toFixed(2)}</span>
                </div>

                <div className="total-row grand">
                  <span>Grand Total</span>
                  <span>₹{getFinalTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Delivery Settings */}
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label>Expected Delivery Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>

              {/* Payment configs */}
              <div className="form-row">
                <div className="form-group">
                  <label>Payment Method</label>
                  <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Delivery Type</label>
                  <select className="form-control" value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)}>
                    <option value="Pickup">Pickup</option>
                    <option value="Delivery">Delivery</option>
                  </select>
                </div>
                <div className="form-group" style={{ minWidth: '180px' }}>
                  <label>Payment Status</label>
                  <input className="form-control" value="Unpaid" readOnly />
                </div>
              </div>

              {deliveryMethod === 'Delivery' && (
                <div className="form-group">
                  <label>Delivery Address</label>
                  <input
                    type="text"
                    placeholder="Delivery location"
                    className="form-control"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Notes / Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. starch shirts, handle delicate saree"
                  className="form-control"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', marginTop: '12px' }}
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Create Order & Print Receipt'}
              </button>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
              Select items from the catalog to begin billing.
            </div>
          )}
        </div>
      </div>

      {/* 80mm Receipt Modal */}
      {showReceiptModal && createdOrderDetails && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px' }}>Print Order Receipt</h3>
              <button className="close-btn" onClick={() => setShowReceiptModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ backgroundColor: '#f1f5f9', padding: '15px' }}>
              
              {/* Receipt Preview */}
              <div className="receipt-preview" id="receipt-print-area">
                <div className="receipt-header">
                  {settings?.logo_url ? (
                    <img src={settings.logo_url} alt="Logo" style={{ maxHeight: '54px', margin: '0 auto 8px', display: 'block' }} />
                  ) : null}
                  <div className="receipt-title">{settings?.business_name || 'WELL DONE LAUNDRY'}</div>
                  {settings?.business_email ? <div style={{ fontSize: '10px' }}>Email: {settings.business_email}</div> : null}
                  {settings?.phone ? <div style={{ fontSize: '10px' }}>Phone: {settings.phone}</div> : null}
                  {settings?.address ? <div style={{ fontSize: '10px' }}>{settings.address}</div> : null}
                </div>
                
                <div className="receipt-divider"></div>
                
                <div>
                  <div className="receipt-row">
                    <span>Order:</span>
                    <span style={{ fontWeight: 'bold' }}>{createdOrderDetails.order_number}</span>
                  </div>
                  <div className="receipt-row">
                    <span>Date:</span>
                    <span>{new Date(createdOrderDetails.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  {createdOrderDetails.expected_delivery_date && (
                    <div className="receipt-row">
                      <span>Delivery:</span>
                      <span>{new Date(createdOrderDetails.expected_delivery_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="receipt-row">
                    <span>Type:</span>
                    <span>{createdOrderDetails.delivery_method || 'Pickup'}</span>
                  </div>
                </div>
                
                <div className="receipt-divider"></div>
                
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Customer Details:</div>
                  <div>Name: {createdOrderDetails.customer_name}</div>
                  <div>Phone: {createdOrderDetails.customer_phone}</div>
                </div>
                
                <div className="receipt-divider"></div>
                
                {/* Items */}
                <div className="receipt-item-list">
                  <div className="receipt-row" style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    <span>Service (Qty)</span>
                    <span>Total</span>
                  </div>
                  {createdOrderDetails.items?.map(item => (
                    <div key={item.id} className="receipt-row" style={{ marginBottom: '2px' }}>
                      <span>{item.service_name} ({item.quantity})</span>
                      <span>₹{(item.quantity * parseFloat(item.unit_price)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="receipt-divider"></div>
                
                <div>
                  <div className="receipt-row">
                    <span>Subtotal:</span>
                    <span>₹{parseFloat(createdOrderDetails.total_amount).toFixed(2)}</span>
                  </div>
                  {parseFloat(createdOrderDetails.discount_amount) > 0 && (
                    <div className="receipt-row">
                      <span>Discount:</span>
                      <span>-₹{parseFloat(createdOrderDetails.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="receipt-row" style={{ fontWeight: 'bold', fontSize: '13px' }}>
                    <span>Grand Total:</span>
                    <span>₹{parseFloat(createdOrderDetails.final_amount).toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="receipt-divider"></div>
                
                <div>
                  <div className="receipt-row">
                    <span>Payment:</span>
                    <span>{createdOrderDetails.payment_method} / {createdOrderDetails.payment_status}</span>
                  </div>
                  <div className="receipt-row">
                    <span>Status:</span>
                    <span>{createdOrderDetails.status}</span>
                  </div>
                </div>

                {createdOrderDetails.notes && (
                  <>
                    <div className="receipt-divider"></div>
                    <div style={{ fontSize: '10px', fontStyle: 'italic' }}>Notes: {createdOrderDetails.notes}</div>
                  </>
                )}
                
                <div className="receipt-qr" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {settings?.upi_id && createdOrderDetails.payment_method === 'UPI' ? (
                        <div style={{ textAlign: 'center' }}>
                          <QRCodeSVG
                            value={`upi://pay?pa=${encodeURIComponent(settings.upi_id)}&pn=${encodeURIComponent(settings.business_name || '')}&am=${parseFloat(createdOrderDetails.final_amount).toFixed(2)}&tn=${encodeURIComponent(createdOrderDetails.order_number || '')}`}
                            size={100}
                            level="M"
                          />
                          <div style={{ fontSize: '12px', marginTop: '6px' }}>UPI: {settings.upi_id}</div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center' }}>
                          <QRCodeSVG value={createdOrderDetails.order_number} size={80} level="M" />
                          <div style={{ fontSize: '12px', marginTop: '6px' }}>Order: {createdOrderDetails.order_number}</div>
                        </div>
                      )}
                </div>
                <div className="receipt-divider" style={{ borderStyle: 'solid' }}></div>
                <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '4px' }}>
                  {settings?.receipt_footer || 'Thank you for your business!'}
                </div>
              </div>
              
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowReceiptModal(false)}>Close</button>
              <button className="btn btn-outline" onClick={() => downloadInvoice('receipt')}>Download 80mm PDF</button>
              <button className="btn btn-outline" onClick={() => downloadInvoice('a4')}>Download A4 PDF</button>
              <button className="btn btn-primary" onClick={() => shareInvoiceWhatsApp('a4')}>Share on WhatsApp</button>
              <button className="btn btn-secondary" onClick={() => printInvoice('a4')}>
                <Printer size={16} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Billing;
