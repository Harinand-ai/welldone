import { useState, useEffect } from 'react';
import './index.css';
import {
  LayoutDashboard, Package, ClipboardList,
  BarChart3, LogOut, Shirt, Settings as SettingsIcon
} from 'lucide-react';

import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Orders from './views/Orders';
import Services from './views/Services';
import Expenses from './views/Expenses';
import Reports from './views/Reports';
import OrderDetail from './views/OrderDetail';
import Settings from './views/Settings';

// ─── Sidebar Nav Item ────────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, view, current, onClick }) {
  const isActive = current === view;
  return (
    <button
      onClick={() => onClick(view)}
      className={`nav-link${isActive ? ' active' : ''}`}
      style={{ background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('orders');
  const [viewingOrderId, setViewingOrderId] = useState(null);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('wd_token');
    const savedUser = localStorage.getItem('wd_user');
    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        // Default view based on role
        setCurrentView(parsed.role === 'owner' ? 'dashboard' : 'orders');
      } catch {
        localStorage.removeItem('wd_token');
        localStorage.removeItem('wd_user');
      }
    }
  }, []);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setCurrentView(loggedInUser.role === 'owner' ? 'dashboard' : 'orders');
  };

  const handleLogout = () => {
    localStorage.removeItem('wd_token');
    localStorage.removeItem('wd_user');
    setUser(null);
    setCurrentView('orders');
    setViewingOrderId(null);
  };

  const handleViewOrder = (orderId) => {
    setViewingOrderId(orderId);
    setCurrentView('order-detail');
  };

  const handleBackFromOrder = () => {
    setViewingOrderId(null);
    setCurrentView('orders');
  };

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!user) {
    return <Login onLoginSuccess={handleLogin} />;
  }

  const isOwner = user.role === 'owner';

  // ── Sidebar navigation items ───────────────────────────────────────────────
  const ownerNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard',   view: 'dashboard'  },
    { icon: ClipboardList,   label: 'Orders',       view: 'orders'     },
    { icon: Package,         label: 'Services',     view: 'services'   },
    { icon: BarChart3,       label: 'Expenses',     view: 'expenses'   },
    { icon: BarChart3,       label: 'Reports',      view: 'reports'    },
    { icon: SettingsIcon,    label: 'Settings',     view: 'settings'   },
  ];

  const cashierNavItems = [
    { icon: ClipboardList,   label: 'Orders',       view: 'orders'     },
  ];

  const navItems = isOwner ? ownerNavItems : cashierNavItems;

  // ── Render active view ─────────────────────────────────────────────────────
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return isOwner
          ? <Dashboard onViewOrder={handleViewOrder} />
          : <Dashboard onViewOrder={handleViewOrder} />; // Cashiers default to Orders, dashboard for owners

      case 'orders':
        return <Orders onViewOrder={handleViewOrder} />;

      case 'services':
        return isOwner ? <Services /> : <Orders onViewOrder={handleViewOrder} />;

      case 'expenses':
        return isOwner ? <Expenses /> : <Orders onViewOrder={handleViewOrder} />;

      case 'reports':
        return isOwner ? <Reports /> : <Orders onViewOrder={handleViewOrder} />;

      case 'settings':
        return isOwner ? <Settings /> : <Orders onViewOrder={handleViewOrder} />;

      case 'order-detail':
        return <OrderDetail orderId={viewingOrderId} onClose={handleBackFromOrder} />;

      default:
        return <Orders onViewOrder={handleViewOrder} />;
    }
  };

  // ── App Shell ──────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="logo-container">
          <Shirt size={26} style={{ color: 'var(--primary)' }} />
          <div>
            <div className="logo-text" style={{ fontSize: '18px' }}>Well Done</div>
            <div className="logo-badge">Yes Yes Group</div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="nav-links">
          {navItems.map(item => (
            <NavItem
              key={item.view}
              icon={item.icon}
              label={item.label}
              view={item.view}
              current={currentView}
              onClick={(v) => {
                setViewingOrderId(null);
                setCurrentView(v);
              }}
            />
          ))}
        </nav>

        {/* User Profile */}
        <div className="user-profile-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: '700',
              color: '#fff',
              flexShrink: 0
            }}>
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role">
                <span style={{
                  width: '6px', height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isOwner ? 'var(--primary)' : 'var(--secondary)',
                  display: 'inline-block'
                }} />
                {user.role}
              </span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
}

export default App;
