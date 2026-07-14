const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isOwner } = require('../middleware/auth');

// GET /api/services
router.get('/', authenticateToken, async (req, res) => {
  try {
    const search = (req.query.q || req.query.query || '').trim();
    const category = (req.query.category || '').trim();
    const conditions = [];
    const params = [];

    if (req.user.role !== 'owner') {
      conditions.push('is_active = true');
    }

    if (search) {
      const paramIndex = params.length + 1;
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(
        `(LOWER(name) LIKE $${paramIndex} OR LOWER(description) LIKE $${paramIndex} OR LOWER(category) LIKE $${paramIndex} OR LOWER(keywords) LIKE $${paramIndex})`
      );
    }

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    let sql = 'SELECT * FROM services';
    if (conditions.length) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY category ASC, name ASC';

    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch services error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/services/:id
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM services WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch service by ID error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/services (Owner only)
router.post('/', authenticateToken, isOwner, async (req, res) => {
  const { name, description, price, category, keywords, is_active } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Service name and price are required' });
  }

  try {
    const result = await db.query(
      'INSERT INTO services (name, description, category, keywords, price, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        name,
        description || null,
        category || 'General',
        keywords || null,
        price,
        is_active !== undefined ? is_active : true,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create service error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/services/:id (Owner only)
router.put('/:id', authenticateToken, isOwner, async (req, res) => {
  const { id } = req.params;
  const { name, description, category, keywords, price, is_active } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Service name and price are required' });
  }

  try {
    const result = await db.query(
      'UPDATE services SET name = $1, description = $2, category = $3, keywords = $4, price = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
      [
        name,
        description || null,
        category || 'General',
        keywords || null,
        price,
        is_active !== undefined ? is_active : true,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update service error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/services/:id (Owner only, soft-delete/disable)
router.delete('/:id', authenticateToken, isOwner, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE services SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ message: 'Service disabled successfully' });
  } catch (err) {
    console.error('Disable service error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
