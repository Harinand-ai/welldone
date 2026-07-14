import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { ShoppingBag, Clock, CheckCircle, DollarSign, TrendingDown, RefreshCw } from 'lucide-react';

function Dashboard({ onViewOrder }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.reports.dashboard();
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
        <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>Loading dashboard statistics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--danger)' }}>
        <p>{error}</p>
        <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={fetchDashboardData}>
          Try Again
        </button>
      </div>
    );
  }

  const { todayStats, paymentBreakdown, recentOrders, recentExpenses, pendingOrders } = data || {};

  const totalExpenses = todayStats?.totalExpenses ?? 0;
  const netProfit = todayStats?.netProfit ?? 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-title-desc">
          <h1>Owner Dashboard</h1>
          <p>Real-time overview of Yes Yes Group Laundry operations today</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchDashboardData}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-grid">
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Today's Orders</span>
            <span className="stat-value">{todayStats?.totalOrders ?? 0}</span>
          </div>
          <div className="stat-icon primary">
            <ShoppingBag size={24} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Pending Work Queue</span>
            <span className="stat-value">{todayStats?.pendingOrders ?? 0}</span>
          </div>
          <div className="stat-icon secondary">
            <Clock size={24} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Delivered Today</span>
            <span className="stat-value">{todayStats?.deliveredOrders ?? 0}</span>
          </div>
          <div className="stat-icon success">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Today's Revenue</span>
            <span className="stat-value">₹{(todayStats?.totalRevenue ?? 0).toFixed(2)}</span>
          </div>
          <div className="stat-icon success">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Today's Expenses</span>
            <span className="stat-value">₹{totalExpenses.toFixed(2)}</span>
          </div>
          <div className="stat-icon danger">
            <TrendingDown size={24} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Today's Profit</span>
            <span className="stat-value" style={{ color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              ₹{netProfit.toFixed(2)}
            </span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent)' }}>
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      <div className="dashboard-details-grid">
        {/* Recent Orders */}
        <div className="card">
          <div className="table-title">
            <h3>Recent Orders</h3>
          </div>
          <div className="table-container">
            {recentOrders && recentOrders.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Date/Time</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: '600' }}>{order.order_number}</td>
                      <td>{order.customer_name}</td>
                      <td>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>₹{parseFloat(order.final_amount).toFixed(2)}</td>
                      <td>
                        <span className={`badge ${order.payment_status === 'Paid' ? 'badge-paid' : 'badge-unpaid'}`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          order.status === 'Pending' ? 'badge-pending' : 'badge-delivered'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => onViewOrder(order.id)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
                No orders found for today.
              </p>
            )}
          </div>
        </div>

        {/* Payment & Expense summaries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="flex-col">
          <div className="card">
            <h3>Pending Work Queue</h3>
            <div style={{ marginTop: '18px' }}>
              {pendingOrders && pendingOrders.length > 0 ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {pendingOrders.map((order) => (
                    <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>{order.order_number}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{order.customer_name} • {order.customer_phone}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : 'No ETA'}</div>
                        <span className={`badge ${order.payment_status === 'Paid' ? 'badge-paid' : 'badge-unpaid'}`} style={{ marginTop: '6px' }}>{order.payment_status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No pending orders in the work queue.</p>
              )}
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="card">
            <h3>Payment Distribution</h3>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(paymentBreakdown || {}).map(([method, amount]) => {
                const total = todayStats?.totalRevenue || 1;
                const percentage = total > 0 ? (amount / total) * 100 : 0;
                return (
                  <div key={method}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '500' }}>{method}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        ₹{amount.toFixed(2)} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        borderRadius: '99px',
                        backgroundColor: method === 'Cash' ? 'var(--primary)' : method === 'UPI' ? 'var(--secondary)' : 'var(--accent)'
                      }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Expenses */}
          <div className="card">
            <h3>Recent Expenses</h3>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentExpenses && recentExpenses.length > 0 ? (
                recentExpenses.map((exp) => (
                  <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '600' }}>{exp.title}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{exp.category} • {new Date(exp.date).toLocaleDateString()}</p>
                    </div>
                    <span style={{ color: 'var(--danger)', fontWeight: '700', fontFamily: 'var(--font-heading)' }}>
                      -₹{parseFloat(exp.amount).toFixed(2)}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
                  No expenses recorded recently.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
