const fs = require('fs');
const path = require('path');
const fetch = global.fetch;

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'tmp');

async function run() {
  console.log('Running smoke tests against', BASE_URL);

  const loginResp = await post('/api/auth/login', { username: 'owner', password: 'owner123' });
  if (!loginResp.token) throw new Error('Login failed');
  const token = loginResp.token;
  console.log('✔ Auth login OK');

  const settings = await get('/api/settings', token);
  console.log('✔ Settings GET OK', settings ? 'settings exist' : 'empty settings');

  const updatedSettings = await put('/api/settings', token, {
    business_name: 'WellDone Laundry',
    upi_id: 'welldone@bank',
    phone: '9876543210',
    address: '123 Laundry Lane, City',
    receipt_footer: 'Thank you for choosing WellDone Laundry!',
    default_delivery_hours: 24,
  });
  console.log('✔ Settings PUT OK', updatedSettings.business_name);

  const uniquePhone = `999${String(Date.now()).slice(-7)}`;
  const customer = await post('/api/customers', token, {
    name: 'Smoke Test Customer',
    phone: uniquePhone,
    email: `smoketest+${Date.now()}@example.com`,
    address: 'Test Address',
  });
  console.log('✔ Customer create OK', customer.id);

  const order = await post('/api/orders', token, {
    customer_id: customer.id,
    items: [
      { service_id: 1, item_name: 'Test Shirt', quantity: 2, unit_price: 50 },
    ],
    discount_amount: 0,
    payment_method: 'UPI',
    payment_status: 'Paid',
    notes: 'Smoke test order',
    expected_delivery_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  console.log('✔ Order create OK', order.order_number);

  const html = await getRaw(`/api/orders/${order.id}/invoice/html`, token);
  if (!html.includes(order.order_number)) throw new Error('Invoice HTML does not contain order number');
  console.log('✔ Invoice HTML preview OK');

  const pdfBuffer = await getBinary(`/api/orders/${order.id}/invoice/pdf?format=a4`, token);
  if (!pdfBuffer || pdfBuffer.length < 2000) throw new Error('Invoice PDF response is too small');
  console.log('✔ Invoice PDF generation OK', pdfBuffer.length, 'bytes');

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const pdfPath = path.join(OUTPUT_DIR, `invoice-${order.order_number}.pdf`);
  fs.writeFileSync(pdfPath, pdfBuffer);
  console.log('✔ Invoice PDF saved to', pdfPath);

  console.log('\nSmoke test completed successfully.');
}

async function request(endpoint, token, opts = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...opts.headers,
  };

  if (opts.body && !Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...opts, headers });
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    const body = contentType.includes('application/json') ? await res.json() : await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${JSON.stringify(body)}`);
  }
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

async function get(endpoint, token) {
  return request(endpoint, token, { method: 'GET' });
}

async function getRaw(endpoint, token) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

async function getBinary(endpoint, token) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function post(endpoint, tokenOrPayload, payload) {
  const [token, body] = typeof tokenOrPayload === 'string'
    ? [tokenOrPayload, payload]
    : [null, tokenOrPayload];
  return request(endpoint, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function put(endpoint, tokenOrPayload, payload) {
  const [token, body] = typeof tokenOrPayload === 'string'
    ? [tokenOrPayload, payload]
    : [null, tokenOrPayload];
  return request(endpoint, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

run().catch(err => {
  console.error('Smoke test failed:', err.message);
  process.exit(1);
});
