import React, { useState } from 'react';

export default function OrdersPage({ orders, negotiations, setActivePage }) {
  const [search, setSearch] = useState('');

  const filteredOrders = orders.filter((o) => {
    const term = search.toLowerCase();
    return (
      o.po_number.toLowerCase().includes(term) ||
      o.medicine.toLowerCase().includes(term) ||
      o.vendor.toLowerCase().includes(term)
    );
  });

  const totalSpend = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalUnits = orders.reduce((sum, o) => sum + (o.quantity || 0), 0);

  return (
    <div className="page-container">
      {/* Header Bar */}
      <div className="page-header-bar">
        <div>
          <h2>📄 Purchase Orders & Procurement Registry</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
            Official purchase orders generated autonomously and persisted into the SQLite database.
          </p>
        </div>

        <div className="filter-bar">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search PO #, medicine, vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-info">
            <h4>Total Purchase Orders</h4>
            <div className="value">{orders.length}</div>
          </div>
          <span className="metric-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            Confirmed POs
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Total Procurement Spend</h4>
            <div className="value" style={{ color: '#10b981' }}>
              ₹{totalSpend.toFixed(2)}
            </div>
          </div>
          <span className="metric-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            Invoiced Total
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Units Procured</h4>
            <div className="value" style={{ color: '#38bdf8' }}>
              {totalUnits}
            </div>
          </div>
          <span className="metric-badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8' }}>
            Replenished Stock
          </span>
        </div>
      </div>

      {/* Main PO Table */}
      <div className="panel">
        <div className="panel-header">
          <h3>Confirmed Purchase Orders (SQLite)</h3>
          <span className="badge">Showing {filteredOrders.length} records</span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <p>No purchase orders recorded yet.</p>
            <p style={{ marginTop: '8px', fontSize: '0.78rem' }}>
              Launch the Agent Dashboard to trigger automated restocking and generate orders.
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
              onClick={() => setActivePage('dashboard')}
            >
              ⚡ Go to Restock Dashboard
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Medicine</th>
                  <th>Contracted Vendor</th>
                  <th>Order Qty</th>
                  <th>Listed Unit Price</th>
                  <th>Agreed Unit Price</th>
                  <th>Total Amount</th>
                  <th>Delivery Transit</th>
                  <th>PO Status</th>
                  <th>Generated Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((po) => (
                  <tr key={po.id || po.po_number}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#38bdf8' }}>
                      {po.po_number}
                    </td>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>{po.medicine}</td>
                    <td>{po.vendor}</td>
                    <td style={{ fontWeight: 700 }}>{po.quantity} units</td>
                    <td>
                      <span style={{ color: '#94a3b8', textDecoration: po.original_price > po.price ? 'line-through' : 'none' }}>
                        ₹{po.original_price.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#34d399' }}>₹{po.price.toFixed(2)}</td>
                    <td style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                      ₹{po.total.toFixed(2)}
                    </td>
                    <td>{po.delivery_days} days</td>
                    <td>
                      <span className="status-pill healthy">✓ {po.status}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#94a3b8' }}>
                      {po.created_at ? new Date(po.created_at).toLocaleTimeString() : 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
