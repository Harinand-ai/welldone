const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const VALID_STATUSES = ['Pending', 'Delivered'];
const VALID_PAYMENT_STATUSES = ['Paid', 'Unpaid'];

const canSendEmails = Boolean(
  process.env.EMAIL_HOST &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS &&
  (process.env.EMAIL_FROM || process.env.EMAIL_USER)
);

const transporter = canSendEmails
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;

async function getOrderWithItems(orderId) {
  const orderResult = await db.query(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone,
             c.email as customer_email, c.address as customer_address
      FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.id = $1`, [orderId]);
  if (!orderResult.rows.length) return null;
  const order = orderResult.rows[0];
  const itemsResult = await db.query(`
      SELECT oi.*, s.name as service_name
      FROM order_items oi JOIN services s ON oi.service_id = s.id
      WHERE oi.order_id = $1`, [orderId]);
  order.items = itemsResult.rows;
  return order;
}

async function sendOrderNotification(order) {
  if (!transporter) {
    throw new Error('Email service is not configured on the server.');
  }

  const subject = `Order ${order.order_number} is ready for pickup`;
  const textLines = [
    `Hello ${order.customer_name},`,
    ``,
    `Your order ${order.order_number} is now ready.`,
    `Total Amount: ₹${parseFloat(order.final_amount).toFixed(2)}`,
    `Payment Status: ${order.payment_status}`,
    `Delivery Method: ${order.payment_method}`,
    order.expected_delivery_date ? `Expected Delivery: ${new Date(order.expected_delivery_date).toLocaleDateString()}` : null,
    ``,
    `Services:`,
    ...order.items.map(item => `- ${item.service_name} x${item.quantity} ₹${parseFloat(item.total_price).toFixed(2)}`),
    ``,
    `Thank you for choosing Yes Yes Group Laundry!`,
  ].filter(Boolean);

  const htmlItems = order.items.map(item => `<li>${item.service_name} x${item.quantity} - ₹${parseFloat(item.total_price).toFixed(2)}</li>`).join('');
  const html = `
    <p>Hello ${order.customer_name},</p>
    <p>Your order <strong>${order.order_number}</strong> is now ready.</p>
    <p><strong>Total Amount:</strong> ₹${parseFloat(order.final_amount).toFixed(2)}<br/>
    <strong>Payment Status:</strong> ${order.payment_status}<br/>
    <strong>Delivery Method:</strong> ${order.payment_method}${order.expected_delivery_date ? `<br/><strong>Expected Delivery:</strong> ${new Date(order.expected_delivery_date).toLocaleDateString()}` : ''}</p>
    <p><strong>Services:</strong></p>
    <ul>${htmlItems}</ul>
    <p>Thank you for choosing Yes Yes Group Laundry!</p>
  `;

  return transporter.sendMail({
    from: emailFrom,
    to: order.customer_email,
    subject,
    text: textLines.join('\n'),
    html,
  });
}

// GET /api/orders
router.get('/', authenticateToken, async (req, res) => {
  const { status, query, startDate, endDate, sort } = req.query;
  try {
    let sql = `
      SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
      FROM orders o JOIN customers c ON o.customer_id = c.id WHERE 1=1`;
    let params = [], i = 1;

    if (status) {
      if (status === 'active') {
        sql += ` AND o.status != $${i++}`;
        params.push('Delivered');
      } else {
        sql += ` AND o.status = $${i++}`;
        params.push(status);
      }
    }

    if (req.query.payment_status) {
      sql += ` AND o.payment_status = $${i++}`;
      params.push(req.query.payment_status);
    }

    if (query) {
      sql += ` AND (o.order_number ILIKE $${i} OR c.name ILIKE $${i} OR c.phone ILIKE $${i})`;
      params.push(`%${query}%`);
      i++;
    }
    if (startDate) {
      sql += ` AND o.created_at >= $${i++}`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND o.created_at <= $${i++}`;
      params.push(`${endDate} 23:59:59`);
    }

    const sortOptions = {
      oldest: 'o.created_at ASC',
      newest: 'o.created_at DESC',
      delivery_asc: 'o.expected_delivery_date ASC NULLS LAST',
      delivery_desc: 'o.expected_delivery_date DESC NULLS LAST',
      customer_asc: 'c.name ASC',
      customer_desc: 'c.name DESC',
    };

    let orderBy = 'o.created_at DESC';
    if (sort && sortOptions[sort]) {
      orderBy = sortOptions[sort];
    } else if (status === 'active') {
      orderBy = 'o.created_at ASC';
    }

    sql += ` ORDER BY ${orderBy}`;
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// GET /api/orders/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await getOrderWithItems(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// POST /api/orders
router.post('/', authenticateToken, async (req, res) => {
  const { customer_id, items, discount_amount, payment_method, payment_status, notes, expected_delivery_date, delivery_method, delivery_address } = req.body;
  if (!customer_id || !items || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'Customer and at least one item required' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    let total = 0;
    for (const item of items) total += item.quantity * item.unit_price;
    const discount = parseFloat(discount_amount || 0);
    const finalAmount = Math.max(0, total - discount);

    // Insert order first, get the real ID, then set order_number
    const insertResult = await client.query(`
      INSERT INTO orders (customer_id, order_number, status, total_amount, discount_amount, final_amount,
                          payment_method, payment_status, notes, expected_delivery_date, delivery_method, delivery_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [customer_id, 'PENDING', 'Pending', total, discount, finalAmount,
       payment_method || 'Cash', payment_status || 'Unpaid', notes || null, expected_delivery_date || null,
       delivery_method || 'Pickup', delivery_address || null]);

    const newOrder = insertResult.rows[0];
    const orderNumber = `WD-${String(newOrder.id).padStart(5, '0')}`;
    await client.query('UPDATE orders SET order_number = $1 WHERE id = $2', [orderNumber, newOrder.id]);
    newOrder.order_number = orderNumber;

    for (const item of items) {
      await client.query(`
        INSERT INTO order_items (order_id, service_id, item_name, quantity, unit_price, total_price, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newOrder.id, item.service_id, item.item_name || null,
         item.quantity, item.unit_price, item.quantity * item.unit_price, item.notes || null]);
    }

    await client.query('COMMIT');
    res.status(201).json(newOrder);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err); res.status(500).json({ error: 'Order creation failed' });
  } finally { client.release(); }
});

// PUT /api/orders/:id/status
router.put('/:id/status', authenticateToken, async (req, res) => {
  let { status } = req.body;
  if (status === 'Received') status = 'Pending';
  if (!VALID_STATUSES.includes(status))
    return res.status(400).json({ error: `Invalid status. Valid: ${VALID_STATUSES.join(', ')}` });
  try {
    const result = await db.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// PUT /api/orders/:id/payment
router.put('/:id/payment', authenticateToken, async (req, res) => {
  const { payment_status, payment_method } = req.body;
  if (!VALID_PAYMENT_STATUSES.includes(payment_status))
    return res.status(400).json({ error: `Invalid payment status. Use ${VALID_PAYMENT_STATUSES.join(', ')}.` });
  try {
    let sql = 'UPDATE orders SET payment_status = $1';
    const params = [payment_status];
    if (payment_method) {
      sql += ', payment_method = $2';
      params.push(payment_method);
      params.push(req.params.id);
      sql += ', updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *';
    } else {
      params.push(req.params.id);
      sql += ', updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
    }
    const result = await db.query(sql, params);
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// DELETE /api/orders/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM order_items WHERE order_id = $1', [req.params.id]);
    const result = await db.query('DELETE FROM orders WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// POST /api/orders/:id/notify
router.post('/:id/notify', authenticateToken, async (req, res) => {
  try {
    const order = await getOrderWithItems(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!order.customer_email) return res.status(400).json({ error: 'No email on file for this customer' });
    if (!transporter) {
      return res.status(501).json({ error: 'Email service is not configured on the server.' });
    }

    try {
      await sendOrderNotification(order);
      res.json({ message: 'Notification email sent successfully' });
    } catch (emailErr) {
      console.error('Email delivery error:', emailErr);
      res.status(500).json({ error: `Email delivery failed: ${emailErr.message}` });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
