import React, { useState } from 'react';

export default function NegotiationsPage({ negotiations, setActivePage }) {
  const [selectedRecordId, setSelectedRecordId] = useState(
    negotiations.length > 0 ? negotiations[0].id : null
  );

  const selectedNegotiation =
    negotiations.find((n) => n.id === selectedRecordId) ||
    (negotiations.length > 0 ? negotiations[0] : null);

  const totalNegotiations = negotiations.length;
  const avgSavingsPct = (
    negotiations.reduce((sum, n) => sum + (n.savings_pct || 0), 0) / (totalNegotiations || 1)
  ).toFixed(1);

  return (
    <div className="page-container">
      {/* Header Bar */}
      <div className="page-header-bar">
        <div>
          <h2>💬 Autonomous Negotiation Transcripts</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
            Full multi-turn bargaining conversation logs between the Store Restocking Agent and vendor partners.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setActivePage('dashboard')}
        >
          ⚡ Go to Restock Agent
        </button>
      </div>

      {/* Summary Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-info">
            <h4>Bargaining Sessions</h4>
            <div className="value">{totalNegotiations}</div>
          </div>
          <span className="metric-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            Multi-Turn Logs
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Average Cost Reduction</h4>
            <div className="value" style={{ color: '#34d399' }}>
              {avgSavingsPct}%
            </div>
          </div>
          <span className="metric-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            Savings Captured
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Deal Acceptance Rate</h4>
            <div className="value" style={{ color: '#38bdf8' }}>
              100%
            </div>
          </div>
          <span className="metric-badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8' }}>
            Successful Bargains
          </span>
        </div>
      </div>

      {negotiations.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <p>No negotiation dialogues have been recorded yet.</p>
            <p style={{ marginTop: '8px', fontSize: '0.78rem' }}>
              Trigger restocking on the dashboard to generate multi-turn conversational negotiation records.
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
              onClick={() => setActivePage('dashboard')}
            >
              ⚡ Launch Agent Dashboard
            </button>
          </div>
        </div>
      ) : (
        <div className="dashboard-grid">
          {/* Left: Negotiation Sessions List */}
          <div className="panel">
            <div className="panel-header">
              <h3>Bargaining History Log</h3>
              <span className="badge">{negotiations.length} Sessions</span>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Vendor</th>
                    <th>Base Price</th>
                    <th>Agreed Price</th>
                    <th>Saved</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {negotiations.map((n) => {
                    const isSelected = selectedNegotiation?.id === n.id;
                    return (
                      <tr
                        key={n.id}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                          borderLeft: isSelected ? '3px solid #06b6d4' : '3px solid transparent'
                        }}
                        onClick={() => setSelectedRecordId(n.id)}
                      >
                        <td style={{ fontWeight: 600 }}>{n.medicine}</td>
                        <td>{n.vendor_name}</td>
                        <td>
                          <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>
                            ₹{n.initial_price.toFixed(2)}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#34d399' }}>₹{n.final_price.toFixed(2)}</td>
                        <td>
                          <span className="status-pill healthy" style={{ fontSize: '0.7rem' }}>
                            -{n.savings_pct}%
                          </span>
                        </td>
                        <td>
                          <span className="status-pill healthy">✓ {n.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Active Transcript Chat Box */}
          <div className="panel">
            <div className="panel-header">
              <h3>
                💬 Transcript: {selectedNegotiation ? selectedNegotiation.medicine : 'Session'}
              </h3>
              {selectedNegotiation && (
                <span className="badge" style={{ color: '#34d399' }}>
                  Final: ₹{selectedNegotiation.final_price.toFixed(2)} / unit (-{selectedNegotiation.savings_pct}%)
                </span>
              )}
            </div>

            {selectedNegotiation ? (
              <div>
                <div style={{ marginBottom: '14px', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Negotiating between <strong style={{ color: '#38bdf8' }}>Store Agent</strong> and{' '}
                  <strong style={{ color: '#818cf8' }}>{selectedNegotiation.vendor_name}</strong> • Reference PO:{' '}
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedNegotiation.po_number || 'Pending'}</span>
                </div>

                <div className="negotiation-box" style={{ maxHeight: '420px' }}>
                  {selectedNegotiation.transcript.map((turn, idx) => {
                    const isAgent =
                      turn.speaker.toLowerCase().includes('agent') ||
                      turn.speaker.toLowerCase().includes('store');
                    return (
                      <div key={idx} className={`chat-bubble ${isAgent ? 'agent' : 'vendor'}`}>
                        <div className="chat-sender">{turn.speaker}</div>
                        <div>{turn.message}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>Select a session from the left to inspect its dialogue transcript.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
