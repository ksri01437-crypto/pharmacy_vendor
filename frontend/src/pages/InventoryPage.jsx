import React, { useState } from 'react';
import ExplainableAgentCard from '../components/ExplainableAgentCard';

export default function InventoryPage({
  inventory,
  onRunAgent,
  depleteStock,
  isRunning,
  setActivePage,
  setSelectedMedicineId
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'critical', 'low', 'healthy'
  const [activeExplainItem, setActiveExplainItem] = useState(null);

  const filteredItems = inventory.filter((item) => {
    const matchesSearch = item.medicine_name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'critical') return item.priority_level === 'CRITICAL' || item.days_of_stock_left <= 1.5;
    if (filter === 'low') return item.is_low_stock;
    if (filter === 'healthy') return !item.is_low_stock;
    return true;
  });

  const criticalCount = inventory.filter(
    (it) => it.priority_level === 'CRITICAL' || it.days_of_stock_left <= 1.5
  ).length;
  const lowCount = inventory.filter((it) => it.is_low_stock).length;
  const healthyCount = inventory.length - lowCount;

  return (
    <div className="page-container">
      {/* Header Bar */}
      <div className="page-header-bar">
        <div>
          <h2>📦 Pharmacy Inventory Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
            Full catalog of pharmaceutical SKUs with real-time Medicine Priority Scoring and explainable restock diagnostics.
          </p>
        </div>

        <div className="filter-bar">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search medicine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({inventory.length})
          </button>
          <button
            className={`filter-pill ${filter === 'critical' ? 'active' : ''}`}
            onClick={() => setFilter('critical')}
            style={{ color: '#fb7185' }}
          >
            🔴 Critical ({criticalCount})
          </button>
          <button
            className={`filter-pill ${filter === 'low' ? 'active' : ''}`}
            onClick={() => setFilter('low')}
          >
            ⚠️ Low Stock ({lowCount})
          </button>
          <button
            className={`filter-pill ${filter === 'healthy' ? 'active' : ''}`}
            onClick={() => setFilter('healthy')}
          >
            ✓ Healthy ({healthyCount})
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-info">
            <h4>Total Monitored SKUs</h4>
            <div className="value">{inventory.length}</div>
          </div>
          <span className="metric-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            Catalog Size
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Critical Shortages (&lt;1.5d)</h4>
            <div className="value" style={{ color: criticalCount > 0 ? '#fb7185' : '#34d399' }}>
              {criticalCount}
            </div>
          </div>
          <span
            className="metric-badge"
            style={{
              background: criticalCount > 0 ? 'rgba(244, 63, 94, 0.18)' : 'rgba(16, 185, 129, 0.15)',
              color: criticalCount > 0 ? '#fb7185' : '#34d399'
            }}
          >
            {criticalCount > 0 ? '🔴 Urgent Restock' : 'Zero Shortage'}
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Healthy Stock SKUs</h4>
            <div className="value" style={{ color: '#34d399' }}>
              {healthyCount}
            </div>
          </div>
          <span className="metric-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            Optimal Buffer
          </span>
        </div>
      </div>

      {/* Active Explainable Agent Card if selected */}
      {activeExplainItem && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Inspecting Explainable Agent Reasoning for: <strong style={{ color: '#38bdf8' }}>{activeExplainItem.medicine_name}</strong>
            </span>
            <button
              className="btn btn-secondary"
              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              onClick={() => setActiveExplainItem(null)}
            >
              ✕ Close Explanation
            </button>
          </div>
          <ExplainableAgentCard
            item={activeExplainItem}
            onRestock={(id, name) => {
              setSelectedMedicineId(id);
              onRunAgent(id, name);
              setActivePage('dashboard');
            }}
            isRunning={isRunning}
          />
        </div>
      )}

      {/* Main Inventory Table */}
      <div className="panel">
        <div className="panel-header">
          <h3>Catalog SKU Registry & Priority Matrix</h3>
          <span className="badge">Showing {filteredItems.length} items</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <p>No medicines matched your search filter.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>SKU ID</th>
                  <th>Medicine Name</th>
                  <th>Priority Score</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Daily Sales</th>
                  <th>Days Left</th>
                  <th>Expiry Date</th>
                  <th>Health Status</th>
                  <th>Simulate Usage</th>
                  <th>Agent Diagnostics</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const pCircle = item.priority_circle || (item.days_of_stock_left <= 1.5 ? '🔴' : item.is_low_stock ? '🟠' : '🟢');
                  const pLevel = item.priority_level || (item.days_of_stock_left <= 1.5 ? 'CRITICAL' : item.is_low_stock ? 'HIGH' : 'HEALTHY');
                  const pScore = item.priority_score || (pLevel === 'CRITICAL' ? 94 : pLevel === 'HIGH' ? 80 : 20);

                  return (
                    <tr key={item.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                        MED-{String(item.id).padStart(3, '0')}
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.medicine_name}</td>
                      <td>
                        <span className={`priority-pill priority-${pLevel}`}>
                          {pCircle} {pLevel} ({pScore})
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            color: item.is_low_stock ? '#fb7185' : '#34d399'
                          }}
                        >
                          {item.current_stock}
                        </span>{' '}
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.unit}</span>
                      </td>
                      <td>{item.reorder_threshold} {item.unit}</td>
                      <td>{item.daily_sales} / day</td>
                      <td>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            color: item.days_of_stock_left <= 1.5 ? '#fb7185' : item.days_of_stock_left <= 3.0 ? '#fb923c' : '#34d399'
                          }}
                        >
                          {item.days_of_stock_left} d
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#94a3b8' }}>
                        {item.expiry_date}
                      </td>
                      <td>
                        {item.is_low_stock ? (
                          <span className="status-pill low">⚠️ Low Stock</span>
                        ) : (
                          <span className="status-pill healthy">✓ Healthy</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            onClick={() => depleteStock(item.id, item.medicine_name, 20)}
                            title="Simulate sales/usage: -20"
                          >
                            -20
                          </button>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            onClick={() => setActiveExplainItem(item)}
                            title="Explain: Why did I order this?"
                          >
                            Why?
                          </button>
                          {item.is_low_stock && (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                              onClick={() => {
                                setSelectedMedicineId(item.id);
                                onRunAgent(item.id, item.medicine_name);
                                setActivePage('dashboard');
                              }}
                              disabled={isRunning}
                            >
                              ⚡ Restock
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
