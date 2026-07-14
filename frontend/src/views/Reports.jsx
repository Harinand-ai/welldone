import React, { useState } from 'react';
import { api } from '../api';
import { Calendar, ShieldAlert, BarChart3, Download, RefreshCw } from 'lucide-react';

function Reports() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0] // last 30 days
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);

  const fetchReports = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const sales = await api.reports.sales(startDate, endDate);
      const expenses = await api.reports.expenses(startDate, endDate);
      const profitLoss = await api.reports.profitLoss(startDate, endDate);

      setReportData({ sales, expenses, profitLoss });
    } catch (err) {
      setError(err.message || 'Failed to generate report data.');
    } finally {
      setLoading(false);
    }
  };

  // CSV Export Utility
  const downloadCSV = (filename, headers, rows) => {
    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSalesReport = () => {
    if (!reportData) return;
    const headers = ["Date", "Orders Count", "Revenue (Rs)"];
    const rows = reportData.sales.dailySales.map(item => [
      new Date(item.date).toLocaleDateString(),
      item.order_count,
      parseFloat(item.revenue).toFixed(2)
    ]);
    downloadCSV(`Sales_Report_${startDate}_to_${endDate}.csv`, headers, rows);
  };

  const exportExpensesReport = () => {
    if (!reportData) return;
    const headers = ["Date", "Title", "Category", "Amount (Rs)", "Notes"];
    const rows = reportData.expenses.expensesList.map(item => [
      new Date(item.date).toLocaleDateString(),
      `"${item.title.replace(/"/g, '""')}"`,
      item.category,
      parseFloat(item.amount).toFixed(2),
      `"${(item.notes || '').replace(/"/g, '""')}"`
    ]);
    downloadCSV(`Expenses_Report_${startDate}_to_${endDate}.csv`, headers, rows);
  };

  const exportPLReport = () => {
    if (!reportData) return;
    const headers = ["Date", "Revenue (Rs)", "Expenses (Rs)", "Net Profit (Rs)"];
    const rows = reportData.profitLoss.map(item => [
      item.date,
      item.revenue.toFixed(2),
      item.expenses.toFixed(2),
      item.profit.toFixed(2)
    ]);
    downloadCSV(`Profit_Loss_Statement_${startDate}_to_${endDate}.csv`, headers, rows);
  };

  const getSalesTotal = () => {
    if (!reportData) return 0;
    return reportData.sales.dailySales.reduce((sum, item) => sum + parseFloat(item.revenue), 0);
  };

  const getExpensesTotal = () => {
    if (!reportData) return 0;
    return reportData.expenses.expensesList.reduce((sum, item) => sum + parseFloat(item.amount), 0);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-desc">
          <h1>Financial Reports</h1>
          <p>Generate sales summaries, profit & loss, and operational reports</p>
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

      {/* Date Filter Panel */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> Start Date
            </label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          
          <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> End Date
            </label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" style={{ padding: '12px 28px' }} onClick={fetchReports} disabled={loading}>
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <BarChart3 size={16} />}
            {loading ? 'Generating...' : 'Generate Reports'}
          </button>
        </div>
      </div>

      {/* Reports Display */}
      {reportData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Main Profit & Loss Statement Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h3>Profit & Loss Summary ({new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()})</h3>
              <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={exportPLReport}>
                <Download size={14} /> Export CSV
              </button>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              marginBottom: '24px'
            }}>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>TOTAL REVENUE (SALES)</span>
                <h2 style={{ fontSize: '32px', color: 'var(--success)', marginTop: '8px', fontFamily: 'var(--font-heading)' }}>
                  ₹{getSalesTotal().toFixed(2)}
                </h2>
              </div>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>TOTAL EXPENSES</span>
                <h2 style={{ fontSize: '32px', color: 'var(--danger)', marginTop: '8px', fontFamily: 'var(--font-heading)' }}>
                  ₹{getExpensesTotal().toFixed(2)}
                </h2>
              </div>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>NET OPERATIONAL PROFIT</span>
                <h2 style={{
                  fontSize: '32px',
                  color: (getSalesTotal() - getExpensesTotal()) >= 0 ? 'var(--success)' : 'var(--danger)',
                  marginTop: '8px',
                  fontFamily: 'var(--font-heading)'
                }}>
                  ₹{(getSalesTotal() - getExpensesTotal()).toFixed(2)}
                </h2>
              </div>
            </div>

            {/* P&L Daily Log Table */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Revenue</th>
                    <th>Expenses</th>
                    <th>Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.profitLoss.map(item => (
                    <tr key={item.date}>
                      <td>{new Date(item.date).toLocaleDateString()}</td>
                      <td style={{ color: 'var(--success)', fontWeight: '600' }}>₹{item.revenue.toFixed(2)}</td>
                      <td style={{ color: 'var(--danger)' }}>-₹{item.expenses.toFixed(2)}</td>
                      <td style={{
                        fontWeight: '700',
                        color: item.profit >= 0 ? 'var(--success)' : 'var(--danger)'
                      }}>
                        ₹{item.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sub-Reports Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* Sales distribution by Payment Method */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Sales by Payment Method</h3>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={exportSalesReport}>
                  Export CSV
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                {reportData.sales.paymentDistribution.map(item => {
                  const total = getSalesTotal() || 1;
                  const pct = (parseFloat(item.revenue) / total) * 100;
                  return (
                    <div key={item.payment_method}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '500' }}>{item.payment_method} ({item.order_count} orders)</span>
                        <span>₹{parseFloat(item.revenue).toFixed(2)} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          backgroundColor: item.payment_method === 'Cash' ? 'var(--primary)' : item.payment_method === 'UPI' ? 'var(--secondary)' : 'var(--accent)',
                          borderRadius: '99px'
                        }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Popular Laundry Services */}
            <div className="card">
              <h3>Popular Laundry Services</h3>
              <div className="table-container" style={{ marginTop: '12px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Service Name</th>
                      <th>Quantity Sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.sales.servicePopularity.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '600' }}>{item.service_name}</td>
                        <td>{item.quantity_sold} pieces</td>
                        <td style={{ fontWeight: '600', color: 'var(--secondary)' }}>₹{parseFloat(item.total_revenue).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expense Categories Summary */}
            <div className="card" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Expense Analysis by Category</h3>
                <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={exportExpensesReport}>
                  <Download size={14} /> Export Expense Log CSV
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {reportData.expenses.categorySummary.map(item => {
                    const total = getExpensesTotal() || 1;
                    const pct = (parseFloat(item.total_amount) / total) * 100;
                    return (
                      <div key={item.category}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '500' }}>{item.category}</span>
                          <span>₹{parseFloat(item.total_amount).toFixed(2)} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--danger)', borderRadius: '99px' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.expenses.expensesList.map(item => (
                        <tr key={item.id}>
                          <td>{new Date(item.date).toLocaleDateString()}</td>
                          <td>{item.title}</td>
                          <td>{item.category}</td>
                          <td style={{ color: 'var(--danger)', fontWeight: '600' }}>₹{parseFloat(item.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Click "Generate Reports" above to compile financial charts and data log sheets.
        </div>
      )}
    </div>
  );
}

export default Reports;
