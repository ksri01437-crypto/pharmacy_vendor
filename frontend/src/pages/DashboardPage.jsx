import React, { useState } from 'react';
import ExplainableAgentCard from '../components/ExplainableAgentCard';

export default function DashboardPage({
  inventory,
  vendors,
  orders,
  negotiations,
  agentLogs,
  isRunning,
  selectedItem,
  setSelectedMedicineId,
  runAgent,
  resetDemo,
  depleteStock,
  lastProcessed
}) {
  const [explainItemOverride, setExplainItemOverride] = useState(null);
  const lowStockItems = inventory.filter((item) => item.is_low_stock);

  // Filter vendors dynamically for the currently selected medicine
  const currentVendors = selectedItem
    ? vendors.filter(
        (v) =>
          v.medicine_id === selectedItem.id ||
          v.medicine?.trim().toLowerCase() === selectedItem.medicine_name?.trim().toLowerCase()
      )
    : vendors;

  // Active negotiation transcript dynamically retrieved for selected item
  const medicineNegotiation =
    (lastProcessed && lastProcessed.medicine_id === selectedItem?.id ? lastProcessed : null) ||
    negotiations.find(
      (n) =>
        n.medicine_id === selectedItem?.id ||
        n.medicine?.trim().toLowerCase() === selectedItem?.medicine_name?.trim().toLowerCase()
    );

  const activeTranscript =
    medicineNegotiation?.transcript ||
    medicineNegotiation?.negotiation?.transcript ||
    [];

  const activeFinalPrice =
    medicineNegotiation?.final_price ||
    medicineNegotiation?.negotiation?.final_price;

  // Metrics
  const totalOrders = orders.length;
  const totalSavings = negotiations.reduce((sum, n) => {
    const orig = n.initial_price || 0;
    const finalP = n.final_price || 0;
    return sum + (orig - finalP);
  }, 0);

  // Item to explain (defaults to selectedItem or override)
  const itemToExplain = explainItemOverride || selectedItem || lowStockItems[0] || null;

  return (
    <div className="page-container">
      {/* Top Header bar with status */}
      <div className="page-header-bar">
        <div>
          <h2>⚡ Autonomous Restocking Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
            Live execution view of medicine priority scoring, explainable agent reasoning, and autonomous vendor negotiation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            id="run-agent-btn"
            className="btn btn-primary"
            onClick={() => runAgent()}
            disabled={isRunning}
            title="Automatically restock all deficit medicines in priority order"
          >
            ⚡ {isRunning ? 'Agent Executing...' : 'Run Restock Agent'}
          </button>

          <button
            id="reset-demo-btn"
            className="btn btn-secondary"
            onClick={resetDemo}
            disabled={isRunning}
            title="Reset database to demo sample state"
          >
            🔄 Reset Baseline
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-info">
            <h4>Total Medicines</h4>
            <div className="value">{inventory.length}</div>
          </div>
          <span className="metric-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            Catalog Active
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Restock Required</h4>
            <div className="value" style={{ color: lowStockItems.length > 0 ? '#fb7185' : '#34d399' }}>
              {lowStockItems.length}
            </div>
          </div>
          <span
            className="metric-badge"
            style={{
              background: lowStockItems.length > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: lowStockItems.length > 0 ? '#fb7185' : '#34d399'
            }}
          >
            {lowStockItems.length > 0 ? 'Deficit Alert' : 'Stock Optimal'}
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Confirmed Orders</h4>
            <div className="value">{totalOrders}</div>
          </div>
          <span className="metric-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            POs in SQLite
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Negotiated Savings</h4>
            <div className="value" style={{ color: '#38bdf8' }}>
              ₹{totalSavings.toFixed(2)}
            </div>
          </div>
          <span className="metric-badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8' }}>
            Per Unit Saved
          </span>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="dashboard-grid">
        {/* LEFT COLUMN: Inventory & Restocking Requirements & Vendors */}
        <div className="dashboard-col">
          {/* 1. Pharmacy Inventory Section */}
          <div className="panel">
            <div className="panel-header">
              <h2>📦 Pharmacy Inventory Overview</h2>
              <span className="badge">{inventory.length} SKUs Monitored</span>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Current Stock</th>
                    <th>Priority Score</th>
                    <th>Daily Sales</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => {
                    const isRowSelected = selectedItem?.id === item.id;
                    const pCircle = item.priority_circle || (item.days_of_stock_left <= 1.5 ? '🔴' : item.is_low_stock ? '🟠' : '🟢');
                    const pLevel = item.priority_level || (item.days_of_stock_left <= 1.5 ? 'CRITICAL' : item.is_low_stock ? 'HIGH' : 'HEALTHY');
                    const pScore = item.priority_score || (pLevel === 'CRITICAL' ? 94 : pLevel === 'HIGH' ? 80 : 20);

                    return (
                      <tr
                        key={item.id}
                        style={{
                          cursor: 'pointer',
                          background: isRowSelected ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                          borderLeft: isRowSelected ? '3px solid #06b6d4' : '3px solid transparent'
                        }}
                        onClick={() => {
                          setSelectedMedicineId(item.id);
                          setExplainItemOverride(item);
                        }}
                      >
                        <td style={{ fontWeight: 600 }}>{item.medicine_name}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: item.is_low_stock ? '#fb7185' : '#f8fafc' }}>
                            {item.current_stock}
                          </span>{' '}
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.unit}</span>
                        </td>
                        <td>
                          <span className={`priority-pill priority-${pLevel}`}>
                            {pCircle} {pLevel} ({pScore})
                          </span>
                        </td>
                        <td>{item.daily_sales} / day</td>
                        <td>
                          {item.is_low_stock ? (
                            <span className="status-pill low">⚠️ Low Stock</span>
                          ) : (
                            <span className="status-pill healthy">✓ Healthy</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              depleteStock(item.id, item.medicine_name, 20);
                            }}
                            title="Simulate sales/usage"
                          >
                            -20 Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#64748b' }}>
              💡 Click any row to inspect its suppliers, priority breakdown, and explanation.
            </div>
          </div>

          {/* 2. Restocking Section with Priority & Explainability */}
          <div className="panel">
            <div className="panel-header">
              <h2>🔔 Restocking Requirements (Priority Ranked)</h2>
              <span className="badge" style={{ color: lowStockItems.length > 0 ? '#fb7185' : '#34d399' }}>
                {lowStockItems.length} Requiring Attention
              </span>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="empty-state">
                <p>✨ All catalog medicines are currently above their reorder thresholds.</p>
                <p style={{ marginTop: '6px', fontSize: '0.78rem' }}>
                  Use "-20 Stock" above or click "Reset Baseline" to simulate low inventory.
                </p>
              </div>
            ) : (
              <div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Priority Score</th>
                        <th>Recommended Qty</th>
                        <th>Remaining</th>
                        <th>Reason</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockItems.map((item) => {
                        const pCircle = item.priority_circle || (item.days_of_stock_left <= 1.5 ? '🔴' : '🟠');
                        const pLevel = item.priority_level || (item.days_of_stock_left <= 1.5 ? 'CRITICAL' : 'HIGH');
                        const pScore = item.priority_score || (pLevel === 'CRITICAL' ? 94 : 80);
                        const isExplainingThis = itemToExplain?.id === item.id;

                        return (
                          <tr
                            key={item.id}
                            style={{
                              background: selectedItem?.id === item.id ? 'rgba(6, 182, 212, 0.08)' : 'transparent'
                            }}
                          >
                            <td style={{ fontWeight: 600, color: '#f8fafc' }}>{item.medicine_name}</td>
                            <td>
                              <span className={`priority-pill priority-${pLevel}`}>
                                {pCircle} {pLevel} ({pScore})
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: '#38bdf8' }}>
                              +{item.recommended_quantity} {item.unit}
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: item.days_of_stock_left <= 1.5 ? '#fb7185' : '#fb923c' }}>
                              {item.days_of_stock_left} d
                            </td>
                            <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{item.reason}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  id={`restock-btn-${item.id}`}
                                  className="btn btn-primary"
                                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                  onClick={() => {
                                    setSelectedMedicineId(item.id);
                                    setExplainItemOverride(item);
                                    runAgent(item.id, item.medicine_name);
                                  }}
                                  disabled={isRunning}
                                >
                                  Restock Now
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '0.72rem',
                                    borderColor: isExplainingThis ? '#06b6d4' : 'var(--border)'
                                  }}
                                  onClick={() => {
                                    setSelectedMedicineId(item.id);
                                    setExplainItemOverride(item);
                                  }}
                                  title="View 'Why did I order this?' explanation"
                                >
                                  Why?
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* "Why did I order this?" — Explainable Agent Card */}
                {itemToExplain && (
                  <ExplainableAgentCard
                    item={itemToExplain}
                    onRestock={(id, name) => {
                      setSelectedMedicineId(id);
                      runAgent(id, name);
                    }}
                    isRunning={isRunning}
                  />
                )}
              </div>
            )}
          </div>

          {/* 3. Vendor System & Comparison Section */}
          <div className="panel">
            <div className="panel-header">
              <h2>🏪 Vendor Network ({selectedItem ? selectedItem.medicine_name : 'No Medicine Selected'})</h2>
              <span className="badge">{currentVendors.length} Suppliers Available</span>
            </div>

            {currentVendors.length === 0 ? (
              <div className="empty-state">
                <p>No vendors registered for {selectedItem?.medicine_name || 'this item'}.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Base Price</th>
                      <th>MOQ</th>
                      <th>Delivery</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentVendors.map((v) => {
                      const isSelected =
                        (lastProcessed?.medicine_id === selectedItem?.id &&
                          lastProcessed?.selected_vendor === v.vendor_name) ||
                        orders.some(
                          (o) =>
                            (o.medicine_id === selectedItem?.id ||
                              o.medicine?.toLowerCase() === selectedItem?.medicine_name?.toLowerCase()) &&
                            o.vendor === v.vendor_name
                        );

                      return (
                        <tr
                          key={v.id}
                          style={{
                            background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'transparent'
                          }}
                        >
                          <td style={{ fontWeight: 600 }}>{v.vendor_name}</td>
                          <td style={{ fontWeight: 700 }}>₹{v.price.toFixed(2)}</td>
                          <td>{v.minimum_order_quantity} units</td>
                          <td>{v.delivery_days} days</td>
                          <td>
                            {isSelected ? (
                              <span className="status-pill healthy">⭐ Selected Deal</span>
                            ) : (
                              <span
                                className="status-pill"
                                style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8' }}
                              >
                                Available
                              </span>
                            )}
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

        {/* RIGHT COLUMN: Agent Activity Stream, Live Negotiation, Purchase Orders */}
        <div className="dashboard-col">
          {/* 4. Agent Activity / Log Panel */}
          <div className="panel">
            <div className="panel-header">
              <h2>🤖 Autonomous Agent Activity Stream</h2>
              <span className="badge">Agentic Loop: OBSERVE → DECIDE → ACT</span>
            </div>

            {agentLogs.length === 0 ? (
              <div className="empty-state">
                <p>The agent is idle. Click <strong>"Restock Now"</strong> or <strong>"Run Restock Agent"</strong> to initiate the autonomous cycle.</p>
              </div>
            ) : (
              <div className="activity-stream">
                {agentLogs.map((log, idx) => (
                  <div key={idx} className="activity-item">
                    <span className={`phase-tag phase-${log.phase.replace(' ', '_')}`}>
                      {log.phase}
                    </span>
                    <span style={{ color: '#e2e8f0' }}>{log.message}</span>
                    <span className="activity-timestamp">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Simple Negotiation Section */}
          <div className="panel">
            <div className="panel-header">
              <h2>💬 Automated Vendor Negotiation ({selectedItem ? selectedItem.medicine_name : ''})</h2>
              {activeFinalPrice && (
                <span className="badge" style={{ color: '#34d399' }}>
                  Deal Finalized: ₹{activeFinalPrice.toFixed(2)}/unit
                </span>
              )}
            </div>

            {activeTranscript.length === 0 ? (
              <div className="empty-state">
                <p>No negotiation transcript for {selectedItem ? selectedItem.medicine_name : 'this item'}.</p>
                <p style={{ marginTop: '6px', fontSize: '0.78rem' }}>
                  Click "Restock Now" to see automated bargaining between Store Agent and Vendor.
                </p>
              </div>
            ) : (
              <div>
                <div className="negotiation-box">
                  {activeTranscript.map((turn, index) => {
                    const isAgent =
                      turn.speaker.toLowerCase().includes('agent') ||
                      turn.speaker.toLowerCase().includes('store');
                    return (
                      <div key={index} className={`chat-bubble ${isAgent ? 'agent' : 'vendor'}`}>
                        <div className="chat-sender">{turn.speaker}</div>
                        <div>{turn.message}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 6. Purchase Order Section */}
          <div className="panel">
            <div className="panel-header">
              <h2>📄 Generated Purchase Orders</h2>
              <span className="badge">{orders.length} Confirmed</span>
            </div>

            {orders.length === 0 ? (
              <div className="empty-state">
                <p>No purchase orders recorded yet in SQLite database.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>PO #</th>
                      <th>Medicine</th>
                      <th>Vendor</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Total</th>
                      <th>Delivery</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((po) => {
                      const isHighlighted =
                        selectedItem &&
                        (po.medicine_id === selectedItem.id ||
                          po.medicine?.toLowerCase() === selectedItem.medicine_name?.toLowerCase());
                      return (
                        <tr
                          key={po.id || po.po_number}
                          style={{
                            background: isHighlighted ? 'rgba(6, 182, 212, 0.08)' : 'transparent'
                          }}
                        >
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#38bdf8' }}>
                            {po.po_number}
                          </td>
                          <td style={{ fontWeight: 600 }}>{po.medicine}</td>
                          <td>{po.vendor}</td>
                          <td style={{ fontWeight: 700 }}>{po.quantity}</td>
                          <td>
                            ₹{po.price.toFixed(2)}{' '}
                            {po.original_price > po.price && (
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                                ₹{po.original_price.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td style={{ fontWeight: 700, color: '#34d399' }}>₹{po.total.toFixed(2)}</td>
                          <td>{po.delivery_days} days</td>
                          <td>
                            <span className="status-pill healthy">✓ {po.status}</span>
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
      </div>
    </div>
  );
}
