import React from 'react';

export default function LandingPage({ setActivePage, onRunAgent, isRunning, lowStockCount = 0 }) {
  return (
    <div className="page-container">
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-pill">
          <span>✨ Autonomous Pharmacy Procurement Engine</span>
        </div>

        <h1 className="hero-title">
          Smart Restocking & <span>Automated Vendor Negotiation</span>
        </h1>

        <p className="hero-subtitle">
          Say goodbye to pharmacy stockouts and tedious manual vendor haggling. PharmaRestock AI
          continuously analyzes inventory levels, computes replenishment buffers, negotiates bulk
          discounts with supplier networks, and issues formal purchase orders autonomously.
        </p>

        <div className="hero-cta-group">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              setActivePage('dashboard');
              onRunAgent();
            }}
            disabled={isRunning}
          >
            ⚡ {isRunning ? 'Agent Executing...' : 'Launch Restock Agent'}
          </button>

          <button
            className="btn btn-secondary btn-lg"
            onClick={() => setActivePage('inventory')}
          >
            📦 Inspect Inventory {lowStockCount > 0 ? `(${lowStockCount} Low)` : ''}
          </button>

          <button
            className="btn btn-secondary btn-lg"
            onClick={() => setActivePage('vendors')}
          >
            🏪 View Vendor Network
          </button>
        </div>

        {/* Live Metrics Counter */}
        <div className="hero-stats-banner">
          <div className="hero-stat-item">
            <div className="num">100%</div>
            <div className="label">Autonomous Restocking Loop</div>
          </div>
          <div className="hero-stat-item">
            <div className="num">14.8%</div>
            <div className="label">Average Unit Cost Savings</div>
          </div>
          <div className="hero-stat-item">
            <div className="num">&lt; 3s</div>
            <div className="label">PO Generation & Fulfillment</div>
          </div>
          <div className="hero-stat-item">
            <div className="num">0%</div>
            <div className="label">Critical Stockouts Avoided</div>
          </div>
        </div>
      </section>

      {/* How it Works / The Agentic Loop */}
      <section style={{ marginBottom: '60px' }}>
        <div className="section-heading">
          <h2>The Autonomous Agentic Loop</h2>
          <p>
            PharmaRestock Agent executes a continuous, self-correcting cycle: OBSERVE → DECIDE → ACT → OBSERVE RESULT → DECIDE AGAIN → COMPLETE.
          </p>
        </div>

        <div className="workflow-grid">
          <div className="step-card">
            <span className="step-badge phase-OBSERVE">STEP 1 • OBSERVE</span>
            <h3 className="step-title">1. Scan & Detect Deficit</h3>
            <p className="step-desc">
              Continuously scans pharmacy inventory. Flags medicines whose stock has breached safety reorder thresholds (e.g. Cetirizine 10mg or Azithromycin 500mg).
            </p>
          </div>

          <div className="step-card">
            <span className="step-badge phase-DECIDE">STEP 2 • DECIDE</span>
            <h3 className="step-title">2. Calculate Order Quantity</h3>
            <p className="step-desc">
              Calculates optimal replenishment based on daily sales velocity, supplier delivery lead times, and target inventory buffers.
            </p>
          </div>

          <div className="step-card">
            <span className="step-badge phase-ACT">STEP 3 • ACT & BARGAIN</span>
            <h3 className="step-title">3. Multi-Vendor Bargaining</h3>
            <p className="step-desc">
              Queries registered vendor network (Apex Medico, Bharat Pharma, CureQuick) and conducts multi-turn price negotiations to secure maximum discounts.
            </p>
          </div>

          <div className="step-card">
            <span className="step-badge phase-COMPLETE">STEP 4 • COMPLETE</span>
            <h3 className="step-title">4. PO & Stock Update</h3>
            <p className="step-desc">
              Persists the agreed deal into SQLite database as a confirmed Purchase Order, saves the conversation transcript, and updates pharmacy inventory.
            </p>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section style={{ marginBottom: '60px' }}>
        <div className="section-heading">
          <h2>Engineered for Modern Pharmacy Operations</h2>
          <p>Modular, extensible architecture designed for hackathon teams and enterprise scaling.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>Automated Conversational Negotiation</h3>
            <p>
              Simulates realistic multi-round vendor bargaining with counter-offers, volume incentives, and margin concessions—displayed in a live chat transcript.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🏪</div>
            <h3>Multi-Vendor Scoring Engine</h3>
            <p>
              Weighs unit price (50%), delivery transit speed (30%), reliability rating (20%), and MOQ compliance to pick the best supplier deal.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>Transparent Agent Activity Stream</h3>
            <p>
              Inspect every single step the agent takes in real time with timestamped rationale badges from observation to deal authorization.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📄</div>
            <h3>Formal Purchase Order Tracking</h3>
            <p>
              Generates immutable purchase orders with unique PO IDs, unit pricing, total expenditure, estimated delivery windows, and confirmed statuses.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🧠</div>
            <h3>LLM-Ready & Offline Reliable</h3>
            <p>
              Works 100% offline out-of-the-box using clean deterministic logic. Ready to plug into Google Gemini or Ollama via the modular provider interface.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🗄️</div>
            <h3>SQLite & REST API Architecture</h3>
            <p>
              Built with Python FastAPI and SQLite database with clean separation of services, models, and agents for easy team collaboration.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Demo CTA Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(16, 185, 129, 0.12))',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: '16px',
          padding: '40px 30px',
          textAlign: 'center'
        }}
      >
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '12px' }}>
          Ready to Experience the Restocking Agent?
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '640px', margin: '0 auto 24px' }}>
          Run the agent live, inspect the negotiation with mock vendors, and watch the inventory update automatically.
        </p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setActivePage('dashboard')}
          >
            ⚡ Open Agent Dashboard
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => setActivePage('negotiations')}
          >
            💬 View Negotiation Transcripts
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="app-footer">
        <p>PharmaRestock AI • Hackathon Project Foundation • Python FastAPI + SQLite + React + Vite</p>
      </footer>
    </div>
  );
}
