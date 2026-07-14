const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isOwner } = require('../middleware/auth');

// Apply Owner restriction to all reports routes
router.use(authenticateToken, isOwner);

// GET /api/reports/dashboard (summary metrics)
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Today's order counts and paid revenue
    const ordersResult = await db.query(`
      SELECT 
        COUNT(id) as total_count,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'Delivered' THEN 1 END) as delivered_count,
        COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN final_amount ELSE 0 END), 0) as total_revenue
      FROM orders
      WHERE created_at::date = $1
    `, [today]);

    // 2. Today's payment method breakdown for Paid orders only
    const paymentBreakdownResult = await db.query(`
      SELECT 
        payment_method,
        COALESCE(SUM(final_amount), 0) as amount
      FROM orders
      WHERE created_at::date = $1
        AND payment_status = 'Paid'
      GROUP BY payment_method
    `, [today]);

    // 3. Pending orders list for work queue
    const pendingOrdersResult = await db.query(`
      SELECT o.id, o.order_number, o.status, o.payment_status, o.expected_delivery_date, c.name as customer_name, c.phone as customer_phone, o.created_at
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.status = 'Pending'
      ORDER BY o.created_at ASC
      LIMIT 8
    `);

    // 4. Today's expense total
    const todayExpensesResult = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE date = $1
    `, [today]);

    // 5. Recent expenses (last 5)
    const recentExpensesResult = await db.query(`
      SELECT * FROM expenses
      ORDER BY date DESC, created_at DESC
      LIMIT 5
    `);

    const todayExpenses = parseFloat(todayExpensesResult.rows[0]?.total_expenses || 0);
    const totalRevenue = parseFloat(ordersResult.rows[0].total_revenue || 0);

    const dashboardData = {
      todayStats: {
        totalOrders: parseInt(ordersResult.rows[0].total_count || 0),
        pendingOrders: parseInt(ordersResult.rows[0].pending_count || 0),
        deliveredOrders: parseInt(ordersResult.rows[0].delivered_count || 0),
        totalRevenue,
        totalExpenses: todayExpenses,
        netProfit: parseFloat((totalRevenue - todayExpenses).toFixed(2)),
      },
      paymentBreakdown: paymentBreakdownResult.rows.reduce((acc, row) => {
        acc[row.payment_method] = parseFloat(row.amount);
        return acc;
      }, { Cash: 0, UPI: 0, Card: 0 }),
      pendingOrders: pendingOrdersResult.rows,
      recentExpenses: recentExpensesResult.rows
    };

    res.json(dashboardData);
  } catch (err) {
    console.error('Fetch dashboard error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/reports/sales (sales breakdown over date range)
router.get('/sales', async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  try {
    // Daily revenue & order count
    const dailyResult = await db.query(`
      SELECT 
        created_at::date as date,
        COUNT(id) as order_count,
        COALESCE(SUM(final_amount), 0) as revenue
      FROM orders
      WHERE created_at::date >= $1 AND created_at::date <= $2
      GROUP BY created_at::date
      ORDER BY date ASC
    `, [startDate, endDate]);

    // Payment method distribution
    const paymentResult = await db.query(`
      SELECT 
        payment_method,
        COUNT(id) as order_count,
        COALESCE(SUM(final_amount), 0) as revenue
      FROM orders
      WHERE created_at::date >= $1 AND created_at::date <= $2
      GROUP BY payment_method
    `, [startDate, endDate]);

    // Service distribution
    const serviceResult = await db.query(`
      SELECT 
        s.name as service_name,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.total_price) as total_revenue
      FROM order_items oi
      JOIN services s ON oi.service_id = s.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at::date >= $1 AND o.created_at::date <= $2
      GROUP BY s.name
      ORDER BY quantity_sold DESC
    `, [startDate, endDate]);

    res.json({
      dailySales: dailyResult.rows,
      paymentDistribution: paymentResult.rows,
      servicePopularity: serviceResult.rows
    });
  } catch (err) {
    console.error('Fetch sales report error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/reports/expenses (expense analysis over date range)
router.get('/expenses', async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  try {
    // Expense categories summary
    const categoryResult = await db.query(`
      SELECT 
        category,
        COUNT(id) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM expenses
      WHERE date >= $1 AND date <= $2
      GROUP BY category
      ORDER BY total_amount DESC
    `, [startDate, endDate]);

    // List of expenses
    const listResult = await db.query(`
      SELECT * FROM expenses
      WHERE date >= $1 AND date <= $2
      ORDER BY date DESC
    `, [startDate, endDate]);

    res.json({
      categorySummary: categoryResult.rows,
      expensesList: listResult.rows
    });
  } catch (err) {
    console.error('Fetch expenses report error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/reports/profit-loss (Profit and Loss summary)
router.get('/profit-loss', async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  try {
    // 1. Get daily revenue
    const revenueResult = await db.query(`
      SELECT 
        created_at::date as date,
        COALESCE(SUM(final_amount), 0) as revenue
      FROM orders
      WHERE created_at::date >= $1 AND created_at::date <= $2
      GROUP BY created_at::date
    `, [startDate, endDate]);

    // 2. Get daily expenses
    const expensesResult = await db.query(`
      SELECT 
        date,
        COALESCE(SUM(amount), 0) as expenses
      FROM expenses
      WHERE date >= $1 AND date <= $2
      GROUP BY date
    `, [startDate, endDate]);

    // Combine results
    const map = {};
    revenueResult.rows.forEach(r => {
      const d = r.date.toISOString().split('T')[0];
      map[d] = { date: d, revenue: parseFloat(r.revenue), expenses: 0, profit: parseFloat(r.revenue) };
    });

    expensesResult.rows.forEach(e => {
      const d = e.date.toISOString().split('T')[0];
      if (map[d]) {
        map[d].expenses = parseFloat(e.expenses);
        map[d].profit = map[d].revenue - map[d].expenses;
      } else {
        map[d] = { date: d, revenue: 0, expenses: parseFloat(e.expenses), profit: -parseFloat(e.expenses) };
      }
    });

    const summary = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));

    res.json(summary);
  } catch (err) {
    console.error('Fetch P&L report error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
