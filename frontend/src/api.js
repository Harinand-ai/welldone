const API_BASE = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('wd_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const data = await response.json();
      errorMsg = data.error || data.message || errorMsg;
    } catch (e) {
      // Not a JSON response
    }
    throw new Error(errorMsg);
  }

  // Check if response is empty
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return null;
}

export const api = {
  auth: {
    login: (username, password) => 
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    me: () => request('/auth/me'),
  },
  customers: {
    list: (query = '') => request(`/customers?query=${encodeURIComponent(query)}`),
    get: (id) => request(`/customers/${id}`),
    lookup: (phone) => request(`/customers/lookup/${encodeURIComponent(phone)}`),
    create: (data) => request('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => request(`/customers/${id}`, {
      method: 'DELETE',
    }),
    orders: (id) => request(`/customers/${id}/orders`),
  },
  services: {
    list: () => request('/services'),
    create: (data) => request('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => request(`/services/${id}`, {
      method: 'DELETE',
    }),
  },
  orders: {
    list: (filters = {}) => {
      const params = new URLSearchParams(filters).toString();
      return request(`/orders?${params}`);
    },
    get: (id) => request(`/orders/${id}`),
    getInvoicePdf: (id, format = 'a4') => fetch(`${API_BASE}/orders/${id}/invoice/pdf?format=${format}`, {
      method: 'GET',
      headers: {
        ...(localStorage.getItem('wd_token') ? { 'Authorization': `Bearer ${localStorage.getItem('wd_token')}` } : {})
      }
    }).then(async r => {
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(r.status === 501 ? 'PDF generation not available on server. HTML returned.' : (txt || 'Failed to fetch invoice'));
      }
      return r.blob();
    }),
    create: (data) => request('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateStatus: (id, status) => request(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
    updatePayment: (id, payment_status, payment_method) => request(`/orders/${id}/payment`, {
      method: 'PUT',
      body: JSON.stringify({ payment_status, payment_method }),
    }),
    notify: (id) => request(`/orders/${id}/notify`, {
      method: 'POST',
    }),
  },
  expenses: {
    list: (filters = {}) => {
      const params = new URLSearchParams(filters).toString();
      return request(`/expenses?${params}`);
    },
    get: (id) => request(`/expenses/${id}`),
    create: (data) => request('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => request(`/expenses/${id}`, {
      method: 'DELETE',
    }),
  },
  reports: {
    dashboard: () => request('/reports/dashboard'),
    sales: (startDate, endDate) => request(`/reports/sales?startDate=${startDate}&endDate=${endDate}`),
    expenses: (startDate, endDate) => request(`/reports/expenses?startDate=${startDate}&endDate=${endDate}`),
    profitLoss: (startDate, endDate) => request(`/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`),
  }
  ,
  settings: {
    get: () => request('/settings'),
    update: (data) => request('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }
};
