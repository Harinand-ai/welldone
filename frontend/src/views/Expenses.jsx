import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Plus, Edit2, Trash2, ShieldAlert, Check, RefreshCw } from 'lucide-react';

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Detergent');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Filters State
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const categories = ['Detergent', 'Electricity', 'Rent', 'Maintenance', 'Salary', 'Transport', 'Misc'];

  useEffect(() => {
    fetchExpenses();
  }, [filterCategory, filterStartDate, filterEndDate]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (filterCategory) filters.category = filterCategory;
      if (filterStartDate) filters.startDate = filterStartDate;
      if (filterEndDate) filters.endDate = filterEndDate;
      
      const list = await api.expenses.list(filters);
      setExpenses(list);
    } catch (err) {
      setError('Failed to fetch expenses.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (exp) => {
    setIsEditing(true);
    setEditingId(exp.id);
    setTitle(exp.title);
    setAmount(exp.amount);
    setCategory(exp.category);
    // Format date properly
    setDate(new Date(exp.date).toISOString().split('T')[0]);
    setNotes(exp.notes || '');
    setError('');
  };

  const handleReset = () => {
    setIsEditing(false);
    setEditingId(null);
    setTitle('');
    setAmount('');
    setCategory('Detergent');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount || !category || !date) {
      setError('All starred fields are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        title,
        amount: parseFloat(amount),
        category,
        date,
        notes
      };

      if (isEditing) {
        await api.expenses.update(editingId, payload);
        setSuccess('Expense updated successfully!');
      } else {
        await api.expenses.create(payload);
        setSuccess('Expense recorded successfully!');
      }

      handleReset();
      fetchExpenses();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save expense.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    
    setLoading(true);
    setError('');
    try {
      await api.expenses.delete(id);
      setSuccess('Expense deleted successfully!');
      fetchExpenses();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete expense.');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryTotal = (cat) => {
    return expenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
  };

  const getTotalExpenses = () => {
    return expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-desc">
          <h1>Expense Manager</h1>
          <p>Record, manage, and categorize operational costs</p>
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
        
        {/* Left column: Add/Edit Expense & Category Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Editor Form */}
          <div className="card">
            <h3>{isEditing ? 'Edit Expense' : 'Record Expense'}</h3>
            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label>Expense Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Detergent powder 10kg"
                  className="form-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="form-control"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <input
                  type="text"
                  placeholder="e.g. bought from wholesale vendor"
                  className="form-control"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }} disabled={loading}>
                  {isEditing ? 'Update Expense' : 'Save Expense'}
                </button>
                {isEditing && (
                  <button type="button" className="btn btn-secondary" onClick={handleReset}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Category-wise Summary */}
          <div className="card">
            <h3>Expense Summary</h3>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {categories.map(cat => {
                const amt = getCategoryTotal(cat);
                const total = getTotalExpenses() || 1;
                const percentage = total > 0 ? (amt / total) * 100 : 0;
                
                if (amt === 0) return null;
                
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '500' }}>{cat}</span>
                      <span style={{ color: 'var(--text-muted)' }}>₹{amt.toFixed(2)}</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: 'var(--danger)', borderRadius: '99px' }}></div>
                    </div>
                  </div>
                );
              })}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                <span>Total Filtered</span>
                <span style={{ color: 'var(--danger)' }}>₹{getTotalExpenses().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Filters & Expense History */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Expense Log</h3>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={fetchExpenses}>
              <RefreshCw size={12} /> Reload
            </button>
          </div>

          {/* Filters Panel */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', uppercase: 'true' }}>Category</span>
              <select className="form-control" style={{ padding: '8px 10px', fontSize: '13px' }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', uppercase: 'true' }}>From Date</span>
              <input
                type="date"
                className="form-control"
                style={{ padding: '8px 10px', fontSize: '13px' }}
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', uppercase: 'true' }}>To Date</span>
              <input
                type="date"
                className="form-control"
                style={{ padding: '8px 10px', fontSize: '13px' }}
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            {expenses.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title / Notes</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id}>
                      <td>{new Date(e.date).toLocaleDateString()}</td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{e.title}</div>
                        {e.notes && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {e.notes}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.15)' }}>
                          {e.category}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700', fontFamily: 'var(--font-heading)' }}>
                        ₹{parseFloat(e.amount).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleEdit(e)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleDelete(e.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>
                No expenses found matching filters.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Expenses;
