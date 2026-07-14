# Well Done — Laundry Management & Billing System
**Yes Yes Group** | Built with Node.js + Express + PostgreSQL + React

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- PostgreSQL (running on port **9946**)
- Database `welldone` already created & schema applied

### 1. Start the Backend API
```powershell
cd backend
npm install       # first time only
node server.js    # or: npm run dev  (uses nodemon for hot-reload)
```
Backend runs on → **http://localhost:5000**

### 2. Start the Frontend
```powershell
cd frontend
npm install       # first time only
npm run dev
```
Frontend runs on → **http://localhost:3000**

---

## 🔐 Default Login Credentials

| Role    | Username  | Password    |
|---------|-----------|-------------|
| Owner   | `owner`   | `owner123`  |
| Cashier | `cashier` | `cashier123`|

> Change passwords in production using the `backend/scripts/seed-users.js` script.

---

## 🗂 Project Structure

```
WellDone/
├── backend/
│   ├── server.js             # Express entrypoint
│   ├── db.js                 # PostgreSQL connection pool
│   ├── .env                  # DB credentials & JWT secret
│   ├── middleware/
│   │   └── auth.js           # JWT + role middleware
│   ├── routes/
│   │   ├── auth.js           # POST /api/auth/login, GET /api/auth/me
│   │   ├── customers.js      # CRUD + lookup + order history
│   │   ├── services.js       # Laundry catalog management
│   │   ├── orders.js         # Order lifecycle + email notify
│   │   ├── expenses.js       # Expense tracking (Owner only)
│   │   └── reports.js        # Dashboard, P&L, Sales reports
│   └── scripts/
│       └── seed-users.js     # Seeds default owner + cashier
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # App shell, sidebar, auth state
│   │   ├── api.js            # Backend API client
│   │   ├── index.css         # Premium dark design system
│   │   └── views/
│   │       ├── Login.jsx     # Authentication screen
│   │       ├── Dashboard.jsx # Owner KPI dashboard
│   │       ├── Billing.jsx   # POS billing + receipt print
│   │       ├── Orders.jsx    # Order list & management
│   │       ├── OrderDetail.jsx  # Single order receipt view
│   │       ├── Customers.jsx # Customer directory + history
│   │       ├── Services.jsx  # Service catalog editor
│   │       ├── Expenses.jsx  # Expense logger + summary
│   │       └── Reports.jsx   # Financial reports + CSV export
│   └── vite.config.js        # Dev proxy to backend
│
└── database/
    └── schema.sql            # Full DB schema + default services seed
```

---

## ✅ Feature Summary

### Owner
- 📊 Real-time dashboard with today's stats, P&L, payment breakdown
- 🖨 POS billing — phone-based customer lookup, cart, discounts, receipt print
- 📦 Full order management — status & payment updates, email alerts
- 👥 Customer directory with order history
- ⚙️ Service catalog editor (add/edit/disable services & prices)
- 💰 Expense tracker with category filters & visual summaries
- 📈 Financial reports — daily P&L, service popularity, payment distribution
- 📤 CSV export for Sales, Expenses, and P&L statements

### Cashier
- 🖨 POS billing (same powerful interface)
- 📦 View & update order statuses
- 👥 Customer lookup & order history

### Receipt
- 80mm thermal-ready receipt with QR code
- Print via `window.print()` — browser handles thermal printer

---

## 🛠 Environment Variables (`backend/.env`)

```env
DB_HOST=localhost
DB_PORT=9946
DB_NAME=welldone
DB_USER=postgres
DB_PASSWORD=Hari@2005
JWT_SECRET=welldone_jwt_secret_yesyesgroup_2024
PORT=5000

# Optional: SMTP for email notifications
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@email.com
# SMTP_PASS=your_app_password
```
