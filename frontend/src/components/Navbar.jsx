import React from 'react';

export default function Navbar({
  activePage,
  setActivePage,
  isRunning,
  onRunAgent,
  onResetDemo,
  lowStockCount = 0
}) {
  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'dashboard', label: 'Agent Dashboard', icon: '⚡' },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: '📦',
      badge: lowStockCount > 0 ? lowStockCount : null,
      badgeColor: '#fb7185'
    },
    { id: 'vendors', label: 'Vendors', icon: '🏪' },
    { id: 'orders', label: 'Purchase Orders', icon: '📄' },
    { id: 'negotiations', label: 'Negotiations', icon: '💬' }
  ];

  return (
    <nav className="top-navbar">
      {/* Brand */}
      <div className="nav-brand" onClick={() => setActivePage('home')}>
        <div className="brand-icon">💊</div>
        <div className="brand-titles">
          <h1>PharmaRestock AI</h1>
          <span>Autonomous Restocking & Negotiation</span>
        </div>
      </div>

      {/* Nav items */}
      <ul className="nav-links">
        {navItems.map((item) => (
          <li key={item.id}>
            <button
              className={`nav-link ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: item.badgeColor,
                    color: '#fff',
                    fontWeight: 700,
                    marginLeft: '2px'
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* Quick Action Controls */}
      <div className="nav-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '6px' }}>
          <span className={isRunning ? 'running-indicator' : ''}></span>
          <span style={{ fontSize: '0.78rem', color: isRunning ? '#34d399' : '#94a3b8' }}>
            {isRunning ? 'Agent Active...' : 'Agent Ready'}
          </span>
        </div>

        <button
          className="btn btn-primary"
          style={{ padding: '7px 14px', fontSize: '0.8rem' }}
          onClick={() => {
            setActivePage('dashboard');
            onRunAgent();
          }}
          disabled={isRunning}
          title="Run autonomous restocking cycle"
        >
          ⚡ {isRunning ? 'Running...' : 'Run Restock Agent'}
        </button>

        <button
          className="btn btn-secondary"
          style={{ padding: '7px 12px', fontSize: '0.8rem' }}
          onClick={onResetDemo}
          disabled={isRunning}
          title="Reset database to demo sample state"
        >
          🔄 Reset
        </button>
      </div>
    </nav>
  );
}
