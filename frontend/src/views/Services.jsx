import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Edit2, ShieldAlert, Check, Search } from 'lucide-react';

function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const list = await api.services.list();
      setServices(list);
    } catch (err) {
      setError('Failed to fetch laundry services.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service) => {
    setIsEditing(true);
    setEditingId(service.id);
    setName(service.name);
    setDescription(service.description || '');
    setPrice(service.price);
    setCategory(service.category || '');
    setKeywords(service.keywords || '');
    setIsActive(service.is_active);
    setError('');
  };

  const handleReset = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setDescription('');
    setPrice('');
    setCategory('');
    setKeywords('');
    setIsActive(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || price === '') {
      setError('Name and price are required.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const payload = {
        name,
        description,
        category: category || 'General',
        keywords: keywords || null,
        price: parseFloat(price),
        is_active: isActive
      };

      if (isEditing) {
        await api.services.update(editingId, payload);
        setSuccess('Laundry service updated successfully!');
      } else {
        await api.services.create(payload);
        setSuccess('Laundry service created successfully!');
      }

      handleReset();
      fetchServices();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save service.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (service) => {
    setLoading(true);
    setError('');
    try {
      await api.services.update(service.id, {
        name: service.name,
        description: service.description,
        price: parseFloat(service.price),
        is_active: !service.is_active
      });
      fetchServices();
      setSuccess(`Service ${!service.is_active ? 'enabled' : 'disabled'} successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update service state.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-desc">
          <h1>Service Management</h1>
          <p>Configure laundry services, pricing, and catalog availability</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Editor Form */}
        <div className="card">
          <h3>{isEditing ? 'Edit Service' : 'Add New Service'}</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
            <div className="form-group">
              <label>Service Name *</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. Silk Saree Dry Clean"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-control"
                style={{ minHeight: '80px', resize: 'vertical' }}
                placeholder="Details about standard processing..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                <label>Category *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. Wash & Iron"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                <label>Keywords</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. shirt,iron,fold"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                className="form-control"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
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
                Active & Available for Billing
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }} disabled={loading}>
                {isEditing ? 'Update Service' : 'Create Service'}
              </button>
              {isEditing && (
                <button type="button" className="btn btn-secondary" onClick={handleReset}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Services List Table */}
        <div className="card">
          <h3>Laundry Catalog</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-control"
                style={{ paddingLeft: '42px' }}
                placeholder="Search catalog by name, category, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ minWidth: '220px' }}>
              <select
                className="form-control"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {Array.from(new Set(services.map(s => s.category).filter(Boolean))).sort().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="table-container">
            {services.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Service Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.filter(s => {
                    const query = searchQuery.trim().toLowerCase();
                    const categoryMatch = !categoryFilter || s.category === categoryFilter;
                    if (!query) return categoryMatch;
                    return categoryMatch && [s.name, s.category, s.description, s.keywords]
                      .filter(Boolean)
                      .some(value => value.toLowerCase().includes(query));
                  }).map(s => (
                    <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.5 }}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{s.name}</div>
                        {s.description && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {s.description}
                          </div>
                        )}
                        {s.keywords && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Keywords: {s.keywords}
                          </div>
                        )}
                      </td>
                      <td>{s.category}</td>
                      <td style={{ fontWeight: '700', color: 'var(--secondary)', fontFamily: 'var(--font-heading)' }}>
                        ₹{parseFloat(s.price).toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge ${s.is_active ? 'badge-delivered' : 'badge-unpaid'}`}>
                          {s.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleEdit(s)}
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            className={`btn ${s.is_active ? 'btn-danger' : 'btn-success'}`}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleToggleActive(s)}
                          >
                            {s.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>
                No services added yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Services;
