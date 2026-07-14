const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Optional puppeteer for PDF generation
let puppeteer = null;
try { puppeteer = require('puppeteer'); } catch (e) { console.warn('puppeteer not installed - PDF endpoints will return HTML.'); }

async function getOrderWithItems(orderId) {
  const orderR = await db.query(`
    SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address
    FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.id = $1
  `, [orderId]);
  if (!orderR.rows.length) return null;
  const order = orderR.rows[0];
  const itemsR = await db.query(`SELECT oi.*, s.name as service_name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = $1`, [orderId]);
  order.items = itemsR.rows;
  return order;
}

async function getSettings() {
  const r = await db.query('SELECT * FROM settings ORDER BY id LIMIT 1');
  return r.rows[0] || {};
}

function renderInvoiceHTML(order, settings, format = 'a4') {
  const businessName = settings.business_name || 'WELL DONE';
  const businessEmail = settings.business_email || '';
  const phone = settings.phone || '';
  const address = settings.address || '';
  const logoHtml = settings.logo_url ? `<img src="${settings.logo_url}" style="max-height:60px; object-fit: contain;" />` : `<div style="font-size:24px;font-weight:700;color:#1f2937;letter-spacing:0.08em;">WELL DONE</div><div style="font-size:12px;color:#4b5563;letter-spacing:0.08em;">Yes Yes Group</div>`;

  const upiPayload = settings.upi_id ? `upi://pay?pa=${encodeURIComponent(settings.upi_id)}&pn=${encodeURIComponent(businessName)}&cu=INR&am=${parseFloat(order.final_amount).toFixed(2)}` : null;
  const qrImage = upiPayload ? `<img src="https://chart.googleapis.com/chart?chs=160x160&cht=qr&chl=${encodeURIComponent(upiPayload)}" alt="UPI QR Code" style="width:120px;height:120px;margin-top:16px;border-radius:12px;"/>` : '';

  const itemsHtml = (order.items || []).map(i => `
    <tr>
      <td style="padding:8px 6px; font-size:12px;">${i.service_name}</td>
      <td style="text-align:center;padding:8px 6px; font-size:12px;">${i.quantity}</td>
      <td style="text-align:right;padding:8px 6px; font-size:12px;">₹${parseFloat(i.unit_price).toFixed(2)}</td>
      <td style="text-align:right;padding:8px 6px; font-size:12px;">₹${parseFloat(i.total_price).toFixed(2)}</td>
    </tr>
  `).join('\n');

  const amountRows = `
    <tr><td colspan="3" style="padding:8px 6px; font-size:12px; color:#6b7280;">Subtotal</td><td style="text-align:right; padding:8px 6px; font-size:12px;">₹${parseFloat(order.total_amount).toFixed(2)}</td></tr>
    ${parseFloat(order.discount_amount) > 0 ? `<tr><td colspan="3" style="padding:8px 6px; font-size:12px; color:#16a34a;">Discount</td><td style="text-align:right; padding:8px 6px; font-size:12px; color:#16a34a;">-₹${parseFloat(order.discount_amount).toFixed(2)}</td></tr>` : ''}
    <tr><td colspan="3" style="padding:10px 6px; font-size:14px; font-weight:700;">Grand Total</td><td style="text-align:right; padding:10px 6px; font-size:14px; font-weight:700;">₹${parseFloat(order.final_amount).toFixed(2)}</td></tr>
  `;

  const upiHtml = (settings.upi_id && order.payment_method === 'UPI') ? `
    <div style="margin-top:16px; display:flex; align-items:center; gap:18px;">
      <div>
        <div style="font-size:12px; color:#4b5563; margin-bottom:6px;">Pay via UPI</div>
        <div style="font-size:13px; font-weight:700;">${settings.upi_id}</div>
      </div>
      ${qrImage}
    </div>
  ` : '';

  // Basic styles - different width for receipt
  const containerStyle = format === 'receipt' ? 'width:300px;font-family:Arial,Helvetica,sans-serif' : 'width:800px;margin:0 auto;font-family:Arial,Helvetica,sans-serif';

  return `<!doctype html>
  <html>
  <head>
  <meta charset="utf-8" />
  <title>Invoice ${order.order_number}</title>
  <style>
    body{font-size:12px}
    table{width:100%;border-collapse:collapse}
    td,th{padding:6px;border-bottom:1px solid #eee}
    .header{display:flex;align-items:center;gap:12px}
  </style>
  </head>
  <body>
    <div style="${containerStyle}">
      <div class="header">
        <div>${logoHtml}</div>
        <div>
          <div style="font-size:18px;font-weight:700">${businessName}</div>
          <div style="font-size:12px">${address}</div>
          <div style="font-size:12px">${phone}</div>
        </div>
      </div>
      <hr />
      <div style="display:flex;justify-content:space-between">
        <div>
          <div><strong>Order:</strong> ${order.order_number}</div>
          <div><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</div>
          <div><strong>Delivery:</strong> ${order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleString() : ''}</div>
        </div>
        <div>
          <div><strong>Customer:</strong> ${order.customer_name || ''}</div>
          <div>${order.customer_phone || ''}</div>
        </div>
      </div>
      <table style="margin-top:10px">
        <thead>
          <tr><th>Service</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th></tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          ${amountRows}
        </tfoot>
      </table>
      ${upiHtml}
      <div style="margin-top:12px;font-size:12px; color:#4b5563;">
        Payment: ${order.payment_method} / ${order.payment_status}
      </div>
      ${businessEmail ? `<div style="margin-top:6px;font-size:12px; color:#4b5563;">Email: ${businessEmail}</div>` : ''}
      <div style="margin-top:16px;font-size:12px; color:#4b5563;">${settings.receipt_footer || 'Thank you for choosing Well Done Laundry!'}</div>
      ${upiHtml}
    </div>
  </body>
  </html>`;
}

// GET HTML preview
router.get('/orders/:id/invoice/html', authenticateToken, async (req, res) => {
  try {
    const order = await getOrderWithItems(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const settings = await getSettings();
    const html = renderInvoiceHTML(order, settings, req.query.format === 'receipt' ? 'receipt' : 'a4');
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('Invoice HTML error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET PDF (format: a4 or receipt)
router.get('/orders/:id/invoice/pdf', authenticateToken, async (req, res) => {
  try {
    const order = await getOrderWithItems(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const settings = await getSettings();
    const format = req.query.format === 'receipt' ? 'receipt' : 'a4';
    const html = renderInvoiceHTML(order, settings, format);

    if (!puppeteer) {
      // If puppeteer not installed, return HTML with 501 status hint
      res.status(501).send(html);
      return;
    }

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    let pdfOptions = { printBackground: true };
    if (format === 'receipt') {
      pdfOptions = { width: '80mm', printBackground: true };
    } else {
      pdfOptions = { format: 'A4', printBackground: true };
    }
    const pdf = await page.pdf(pdfOptions);
    await browser.close();

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="${order.order_number}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('Invoice PDF error:', err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

module.exports = router;
