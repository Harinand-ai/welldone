const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isOwner } = require('../middleware/auth');

// GET /api/settings - any authenticated user can read settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM settings ORDER BY id LIMIT 1');
    if (r.rows.length === 0) return res.json({});
    res.json(r.rows[0]);
  } catch (err) {
    console.error('Fetch settings error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/settings - owner only, create or update the single settings row
router.put('/', authenticateToken, isOwner, async (req, res) => {
  const {
    business_name,
    business_email,
    upi_id,
    phone,
    address,
    logo_url,
    receipt_footer,
    default_delivery_hours,
    printer_settings
  } = req.body;

  try {
    const existing = await db.query('SELECT id FROM settings ORDER BY id LIMIT 1');
    if (existing.rows.length === 0) {
      const insert = await db.query(
        `INSERT INTO settings (business_name, business_email, upi_id, phone, address, logo_url, receipt_footer, default_delivery_hours, printer_settings)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [business_name || null, business_email || null, upi_id || null, phone || null, address || null, logo_url || null, receipt_footer || null, default_delivery_hours || 24, printer_settings || null]
      );
      return res.json(insert.rows[0]);
    }

    const id = existing.rows[0].id;
    const update = await db.query(
      `UPDATE settings SET business_name = $1, business_email = $2, upi_id = $3, phone = $4, address = $5, logo_url = $6, receipt_footer = $7, default_delivery_hours = $8, printer_settings = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10 RETURNING *`,
      [business_name || null, business_email || null, upi_id || null, phone || null, address || null, logo_url || null, receipt_footer || null, default_delivery_hours || 24, printer_settings || null, id]
    );
    res.json(update.rows[0]);
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
