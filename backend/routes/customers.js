const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/customers (search & list)
router.get('/', authenticateToken, async (req, res) => {
  const { query } = req.query; // Search query (name or phone)
  
  try {
    let sql = 'SELECT * FROM customers WHERE is_active = true';
    let params = [];

    if (query) {
      sql += ' AND (name ILIKE $1 OR phone ILIKE $1)';
      params.push(`%${query}%`);
    }

    sql += ' ORDER BY name ASC';
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch customers error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/customers/lookup/:phone
router.get('/lookup/:phone', authenticateToken, async (req, res) => {
  const { phone } = req.params;
  try {
    const result = await db.query('SELECT * FROM customers WHERE phone = $1', [phone]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Customer lookup error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/customers/:id
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch customer by id error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/customers
router.post('/', authenticateToken, async (req, res) => {
  const { name, phone, email, address } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and Phone number are required' });
  }

  try {
    // Check if phone already exists
    const checkExist = await db.query('SELECT * FROM customers WHERE phone = $1', [phone]);
    if (checkExist.rows.length > 0) {
      const existingCustomer = checkExist.rows[0];
      if (!existingCustomer.is_active) {
        // Reactivate customer if they were soft-deleted
        const reactivate = await db.query(
          'UPDATE customers SET name = $1, email = $2, address = $3, is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
          [name, email || null, address || null, existingCustomer.id]
        );
        return res.status(200).json(reactivate.rows[0]);
      }
      return res.status(400).json({ error: 'Customer with this phone number already exists' });
    }

    const result = await db.query(
      'INSERT INTO customers (name, phone, email, address) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, phone, email || null, address || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/customers/:id
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address, is_active } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and Phone number are required' });
  }

  try {
    // Check if phone is taken by another customer
    const checkPhone = await db.query('SELECT * FROM customers WHERE phone = $1 AND id != $2', [phone, id]);
    if (checkPhone.rows.length > 0) {
      return res.status(400).json({ error: 'Another customer with this phone number already exists' });
    }

    const result = await db.query(
      'UPDATE customers SET name = $1, phone = $2, email = $3, address = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [name, phone, email || null, address || null, is_active !== undefined ? is_active : true, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/customers/:id (Soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE customers SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deactivated successfully' });
  } catch (err) {
    console.error('Deactivate customer error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/customers/:id/orders
router.get('/:id/orders', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch customer orders error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
