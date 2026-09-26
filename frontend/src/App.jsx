import React, { useState, useEffect } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

export default function App() {
  const [inventory, setInventory] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [negotiations, setNegotiations] = useState([]);
  const [agentLogs, setAgentLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState('Paracetamol 500mg');
  const [lastProcessed, setLastProcessed] = useState(null);

  // Load all data on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [invRes, venRes, ordRes, negRes] = await Promise.all([
        fetch(`${API_BASE}/api/inventory`),
        fetch(`${API_BASE}/api/vendors`),
        fetch(`${API_BASE}/api/orders`),
        fetch(`${API_BASE}/api/negotiations`)
      ]);

      if (invRes.ok) setInventory(await invRes.json());
      if (venRes.ok) setVendors(await venRes.json());
      if (ordRes.ok) setOrders(await ordRes.json());
      if (negRes.ok) setNegotiations(await negRes.json());
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
  };

  // Run the autonomous agent loop
  const runAgent = async (medicine = null) => {
    setIsRunning(true);
    try {
      const res = await fetch(`${API_BASE}/api/agent/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicine_name: medicine })
      });
      const data = await res.json();
      if (data.logs) {
        setAgentLogs(data.logs);
      }
      if (data.processed_items && data.processed_items.length > 0) {
        setLastProcessed(data.processed_items[0]);
      }
      await fetchDashboardData();
    } catch (err) {
      console.error('Error running agent:', err);
    } finally {
      setIsRunning(false);
    }
  };

  // Reset demo baseline
  const resetDemo = async () => {
    try {
      await fetch(`${API_BASE}/api/demo/reset`, { method: 'POST' });
      setAgentLogs([]);
      setLastProcessed(null);
      await fetchDashboardData();
    } catch (err) {
      console.error('Error resetting demo:', err);
    }
  };

  // Simulate usage/depletion of medicine
  const depleteStock = async (medicineName, amount = 30) => {
    try {
      await fetch(`${API_BASE}/api/demo/deplete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicine_name: medicineName, deplete_by: amount })
      });
      await fetchDashboardData();
    } catch (err) {
      console.error('Error depleting stock:', err);
    }
  };

  // Filter items needing restock
  const lowStockItems = inventory.filter((item) => item.is_low_stock);

  // Filter vendors for selected medicine
  const currentVendors = vendors.filter((v) => v.medicine === selectedMedicine);

  // Calculate metrics
  const totalOrders = orders.length;
  const totalSpend = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalSavings = negotiations.reduce((sum, n) => {
    const orig = n.initial_price || 0;
    const finalP = n.final_price || 0;
    return sum + (orig - finalP);
  }, 0);

  // Active negotiation transcript to display
  const activeTranscript =
    lastProcessed?.negotiation?.transcript ||
    (negotiations.length > 0 ? negotiations[0].transcript : []);

  const activeNegotiationDetails = lastProcessed || (negotiations.length > 0 ? negotiations[0] : null);

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">💊</div>
          <div className="brand-text">
            <h1>PharmaRestock Agent</h1>
            <p>Autonomous Pharmacy Inventory Restocking & Vendor Negotiation Engine</p>
          </div>
        </div>

        <div className="header-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
            <span className={isRunning ? 'running-indicator' : ''}></span>
            <span style={{ fontSize: '0.82rem', color: isRunning ? '#34d399' : '#94a3b8' }}>
              {isRunning ? 'Agent Executing Loop...' : 'Agent Standby'}
            </span>
          </div>

          <button
            id="run-agent-btn"
            className="btn btn-primary"
            onClick={() => runAgent()}
            disabled={isRunning}
          >
            ⚡ {isRunning ? 'Processing...' : 'Run Restock Agent'}
          </button>

          <button
            id="reset-demo-btn"
            className="btn btn-secondary"
            onClick={resetDemo}
            disabled={isRunning}
            title="Reset database to demo sample data"
          >
            🔄 Reset Demo
          </button>
        </div>
      </header>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-info">
            <h4>Total Items</h4>
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
            {lowStockItems.length > 0 ? 'Action Needed' : 'Inventory Optimal'}
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Purchase Orders</h4>
            <div className="value">{totalOrders}</div>
          </div>
          <span className="metric-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            Confirmed POs
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
              <h2>📦 Pharmacy Inventory</h2>
              <span className="badge">{inventory.length} SKUs Monitored</span>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Current Stock</th>
                    <th>Reorder Level</th>
                    <th>Daily Sales</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr
                      key={item.id}
                      style={{ cursor: 'pointer', background: selectedMedicine === item.medicine_name ? 'rgba(6, 182, 212, 0.08)' : 'transparent' }}
                      onClick={() => setSelectedMedicine(item.medicine_name)}
                    >
                      <td style={{ fontWeight: 600 }}>{item.medicine_name}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: item.is_low_stock ? '#fb7185' : '#f8fafc' }}>
                          {item.current_stock}
                        </span>{' '}
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.unit}</span>
                      </td>
                      <td>{item.reorder_threshold}</td>
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
                            depleteStock(item.medicine_name, 20);
                          }}
                          title="Simulate sales/usage"
                        >
                          -20 Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Restocking Section */}
          <div className="panel">
            <div className="panel-header">
              <h2>🔔 Restocking Requirements</h2>
              <span className="badge" style={{ color: lowStockItems.length > 0 ? '#fb7185' : '#34d399' }}>
                {lowStockItems.length} Requiring Attention
              </span>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="empty-state">
                <p>✨ No medicines currently below reorder threshold.</p>
                <p style={{ marginTop: '6px', fontSize: '0.78rem' }}>
                  Use "-20 Stock" above or click "Reset Demo" to simulate low inventory.
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Recommended Qty</th>
                      <th>Reason / Diagnosis</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600, color: '#f8fafc' }}>{item.medicine_name}</td>
                        <td style={{ fontWeight: 700, color: '#38bdf8' }}>
                          +{item.recommended_quantity} {item.unit}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{item.reason}</td>
                        <td>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                            onClick={() => runAgent(item.medicine_name)}
                            disabled={isRunning}
                          >
                            Restock Now
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 3. Vendor System & Comparison Section */}
          <div className="panel">
            <div className="panel-header">
              <h2>🏪 Vendor Network ({selectedMedicine})</h2>
              <span className="badge">{currentVendors.length} Suppliers Available</span>
            </div>

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
                      lastProcessed?.selected_vendor === v.vendor_name &&
                      lastProcessed?.medicine_name === v.medicine;
                    return (
                      <tr key={v.id} style={{ background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'transparent' }}>
                        <td style={{ fontWeight: 600 }}>{v.vendor_name}</td>
                        <td style={{ fontWeight: 700 }}>₹{v.price.toFixed(2)}</td>
                        <td>{v.minimum_order_quantity} units</td>
                        <td>{v.delivery_days} days</td>
                        <td>
                          {isSelected ? (
                            <span className="status-pill healthy">⭐ Selected Deal</span>
                          ) : (
                            <span className="status-pill" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8' }}>
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
            <div style={{ marginTop: '12px', fontSize: '0.75rem', color: '#64748b' }}>
              💡 Select any row in the inventory table to inspect suppliers and quotes for that medicine.
            </div>
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
                <p>The agent is idle. Click <strong>"Run Restock Agent"</strong> to initiate the autonomous cycle.</p>
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
              <h2>💬 Automated Vendor Negotiation</h2>
              {activeNegotiationDetails && (
                <span className="badge" style={{ color: '#34d399' }}>
                  Deal Finalized: ₹{activeNegotiationDetails.final_price?.toFixed(2) || activeNegotiationDetails.negotiation?.final_price?.toFixed(2)}/unit
                </span>
              )}
            </div>

            {activeTranscript.length === 0 ? (
              <div className="empty-state">
                <p>No active negotiation transcript.</p>
                <p style={{ marginTop: '6px', fontSize: '0.78rem' }}>
                  Run the restock agent to see live conversational bargaining between Store Agent and Vendor.
                </p>
              </div>
            ) : (
              <div>
                <div className="negotiation-box">
                  {activeTranscript.map((turn, index) => {
                    const isAgent = turn.speaker.toLowerCase().includes('agent') || turn.speaker.toLowerCase().includes('store');
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
                    {orders.map((po) => (
                      <tr key={po.id || po.po_number}>
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
                    ))}
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
