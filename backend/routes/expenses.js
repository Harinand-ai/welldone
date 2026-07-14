const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isOwner } = require('../middleware/auth');

// Apply Owner restriction to all expense routes
router.use(authenticateToken, isOwner);

// GET /api/expenses (list, filter by date, category)
router.get('/', async (req, res) => {
  const { category, startDate, endDate } = req.query;

  try {
    let sql = 'SELECT * FROM expenses WHERE 1=1';
    let params = [];
    let paramIndex = 1;

    if (category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (startDate) {
      sql += ` AND date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      sql += ` AND date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    sql += ' ORDER BY date DESC, created_at DESC';
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch expenses error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/expenses/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch expense by ID error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  const { title, amount, category, date, notes } = req.body;

  if (!title || !amount || !category || !date) {
    return res.status(400).json({ error: 'Title, amount, category, and date are required' });
  }

  // Verify category is valid
  const validCategories = ['Detergent', 'Electricity', 'Rent', 'Maintenance', 'Salary', 'Transport', 'Misc'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid expense category' });
  }

  try {
    const result = await db.query(
      'INSERT INTO expenses (title, amount, category, date, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, amount, category, date, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, amount, category, date, notes } = req.body;

  if (!title || !amount || !category || !date) {
    return res.status(400).json({ error: 'Title, amount, category, and date are required' });
  }

  const validCategories = ['Detergent', 'Electricity', 'Rent', 'Maintenance', 'Salary', 'Transport', 'Misc'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid expense category' });
  }

  try {
    const result = await db.query(
      'UPDATE expenses SET title = $1, amount = $2, category = $3, date = $4, notes = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [title, amount, category, date, notes || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
