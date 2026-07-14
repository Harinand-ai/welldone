import React, { useState, useEffect } from 'react';
import { api } from '../api';

function Settings() {
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [upiId, setUpiId] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [printerName, setPrinterName] = useState('');
  const [paperWidth, setPaperWidth] = useState(80);
  const [receiptFooter, setReceiptFooter] = useState('');
  const [defaultDeliveryHours, setDefaultDeliveryHours] = useState(24);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await api.settings.get();
        if (!mounted) return;
        if (s.business_name) setBusinessName(s.business_name);
        if (s.business_email) setBusinessEmail(s.business_email);
        if (s.upi_id) setUpiId(s.upi_id);
        if (s.phone) setPhone(s.phone);
        if (s.address) setAddress(s.address);
        if (s.logo_url) setLogoUrl(s.logo_url);
        if (s.printer_settings) {
          setPrinterName(s.printer_settings.printer_name || '');
          setPaperWidth(s.printer_settings.paper_width_mm || 80);
        }
        if (s.receipt_footer) setReceiptFooter(s.receipt_footer);
        if (s.default_delivery_hours) setDefaultDeliveryHours(s.default_delivery_hours);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      business_name: businessName,
      business_email: businessEmail,
      upi_id: upiId,
      phone,
      address,
      logo_url: logoUrl,
      receipt_footer: receiptFooter,
      default_delivery_hours: defaultDeliveryHours,
      printer_settings: {
        printer_name: printerName,
        paper_width_mm: paperWidth,
      }
    };
    try {
      await api.settings.update(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError('Failed to save settings: ' + (e.message || 'Server error'));
      setSaved(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-desc">
          <h1>Settings</h1>
          <p>Configure business details used in invoices and receipts</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSave}>
          {error && (
            <div className="card" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', marginBottom: '18px' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Business Name</label>
            <input className="form-control" value={businessName} onChange={e => setBusinessName(e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Business Email</label>
              <input type="email" className="form-control" placeholder="hello@yourbusiness.com" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="form-control" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Address</label>
              <input className="form-control" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Logo URL</label>
              <input className="form-control" placeholder="https://..." value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Receipt Footer</label>
            <input className="form-control" value={receiptFooter} onChange={e => setReceiptFooter(e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Default Delivery Time (hours)</label>
              <input type="number" className="form-control" value={defaultDeliveryHours} onChange={e => setDefaultDeliveryHours(parseInt(e.target.value || 24))} />
            </div>
            <div className="form-group">
              <label>Printer Name</label>
              <input className="form-control" value={printerName} onChange={e => setPrinterName(e.target.value)} placeholder="e.g. Zebra LP2844" />
            </div>
            <div className="form-group">
              <label>Paper Width (mm)</label>
              <input type="number" className="form-control" value={paperWidth} onChange={e => setPaperWidth(parseInt(e.target.value || 80))} />
            </div>
          </div>

          {logoUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <img src={logoUrl} alt="Logo Preview" style={{ height: '56px', borderRadius: '10px', objectFit: 'contain', backgroundColor: '#fff' }} />
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Logo preview for receipts and invoice headers.</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button className="btn btn-primary" type="submit">Save Settings</button>
            {saved && <div style={{ alignSelf: 'center', color: 'var(--success)' }}>Saved</div>}
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;
