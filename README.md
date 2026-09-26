# 💊 Pharmacy Smart Restocking & Vendor Negotiation Agent

An autonomous AI agentic system designed for pharmacies to continuously monitor medicine inventory, detect items below reorder thresholds, calculate required restock quantities, query vendor networks, evaluate and compare quotes, conduct multi-turn automated price negotiations, generate official Purchase Orders (POs), and update store inventory.

---

## 🌟 Key Highlights

- **Autonomous Agentic Loop**: Strict execution pattern: `OBSERVE` → `DECIDE` → `ACT` → `OBSERVE RESULT` → `DECIDE AGAIN` → `COMPLETE`.
- **Modular & Extensible**: Built cleanly for a 4-person team. Decoupled agent logic, database, negotiation provider, and UI.
- **Offline & LLM-Ready**: Runs 100% out of the box with zero external API keys via a rule-based negotiator; comes with a plug-and-play LLM interface ready for Google Gemini or Ollama.
- **Interactive Full-Stack Dashboard**: React + Vite UI with real-time agent activity logs, live bargaining transcript, stock tables, and PO tracking.

---

## 🏗️ Architecture & Project Structure

```
pharmacy_vendor/
├── backend/
│   ├── main.py                  # FastAPI application entrypoint & API endpoints
│   ├── agents/
│   │   └── store_agent.py       # Autonomous Store Restock Agent (Agentic Loop)
│   ├── services/
│   │   ├── inventory_service.py # Inventory tracking, deficit detection, quantity calculations
│   │   ├── vendor_service.py    # Vendor retrieval, quote scoring & comparison
│   │   └── order_service.py     # PO generation & negotiation transcript recording
│   ├── database/
│   │   ├── database.py          # SQLite engine & session management
│   │   └── models.py            # SQLAlchemy models (Inventory, Vendor, PO, Negotiation)
│   ├── llm/
│   │   └── provider.py          # Modular negotiator interface (Rule-based & LLM ready)
│   ├── data/
│   │   ├── inventory.json       # Sample pharmacy inventory catalog
│   │   └── vendors.json         # Mock vendor quotes, MOQs, and discount profiles
│   └── requirements.txt         # Backend Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Dashboard UI (Inventory, Restock, Vendors, Chat, POs)
│   │   ├── index.css            # Custom modern theme & animations
│   │   └── main.jsx             # React entrypoint
│   ├── index.html               # Web page container
│   ├── package.json             # Frontend NPM scripts & dependencies
│   └── vite.config.js           # Vite config with backend API proxy
├── .env.example                 # Environment configuration template
├── .gitignore                   # Git ignore patterns
└── README.md                    # Project documentation
```

---

## 🔄 End-to-End Workflow

```
Pharmacy Inventory
       ↓
Check Stock
       ↓
Detect Medicine Needing Restock (Stock ≤ Reorder Threshold)
       ↓
Calculate Required Quantity (Buffer to Target Stock)
       ↓
Get Vendor Offers (Vendor A, Vendor B, Vendor C)
       ↓
Compare Vendors (Weighted Score: Price 50%, Delivery 30%, Reliability 20%)
       ↓
Autonomous Negotiation (Multi-turn conversational counter-offers)
       ↓
Select Final Deal (Acceptance at or near vendor bottom line)
       ↓
Generate Purchase Order (Persisted in SQLite database)
       ↓
Update Inventory (Replenishes stock levels)
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python**: 3.10+
- **Node.js**: v18+ (npm v9+)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/ksri01437-crypto/pharmacy_vendor.git
cd pharmacy_vendor
```

---

### Step 2: Set Up and Run the Backend

1. Navigate to the root directory:
   ```bash
   pip install -r backend/requirements.txt
   ```

2. (Optional) Configure environment variables:
   ```bash
   cp .env.example .env
   ```

3. Launch the FastAPI server:
   ```bash
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```

   The backend will be running at: **`http://127.0.0.1:8000`**  
   Interactive API docs (Swagger): **`http://127.0.0.1:8000/docs`**

---

### Step 3: Set Up and Run the Frontend

1. In a new terminal, navigate into `frontend`:
   ```bash
   cd frontend
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. Open your browser at: **`http://127.0.0.1:5173`**

---

## 🎯 Demo Walkthrough

1. **Dashboard Overview**: Open `http://127.0.0.1:5173`. You will see pharmacy inventory with **Paracetamol 500mg** (25 units stock vs 60 reorder threshold) highlighted in red.
2. **Review Restocking Requirements**: Notice the recommendation for Paracetamol (Recommended Qty: +180 units) with diagnostic reasoning.
3. **Inspect Vendor Quotes**: Click on the Paracetamol row to inspect vendors:
   - *Apex Medico (Vendor A)*: ₹10/unit, MOQ 100, 2 days delivery.
   - *Bharat Pharma Wholesalers (Vendor B)*: ₹8/unit, MOQ 500, 7 days delivery.
   - *CureQuick Logistics (Vendor C)*: ₹9.50/unit, MOQ 150, 3 days delivery.
4. **Trigger Agent**: Click **`⚡ Run Restock Agent`**:
   - The agent steps through the **OBSERVE → DECIDE → ACT** loop.
   - Apex Medico is selected based on urgency and MOQ fit.
   - The agent conducts automated multi-turn bargaining:
     - Store Agent: *"Can you offer a competitive discount for 180 units?"*
     - Vendor: *"I can offer ₹9.55 per unit."*
     - Store Agent: *"Can you meet us at ₹9.30 per unit?"*
     - Vendor: *"Deal accepted at ₹9.30 per unit."*
   - A Purchase Order (e.g. `PO-20260926-XXXX`) is issued and stored in SQLite.
   - Paracetamol stock updates immediately to healthy levels.
5. **Reset & Re-test**: Click **`🔄 Reset Demo`** anytime to restore baseline sample data, or click **`-20 Stock`** on any medicine to simulate live sales and test restocking again.

---

## 🧩 Team Extension Guide

The codebase is structured so team members can add features without breaking existing code:

- **LLM Reasoning**: Edit [backend/llm/provider.py](file:///backend/llm/provider.py) to plug in Gemini or Ollama. The `BaseNegotiator` interface and prompt templates are already defined.
- **Demand Forecasting**: Edit [backend/services/inventory_service.py](file:///backend/services/inventory_service.py) in `get_items_needing_restock()` to add seasonal or ML-based consumption models.
- **Vendor Scoring**: Edit [backend/services/vendor_service.py](file:///backend/services/vendor_service.py) in `compare_vendor_offers()` to adjust evaluation weights or add custom rating factors.
- **Multi-Round Negotiation Rules**: Edit `RuleBasedNegotiator` in [backend/llm/provider.py](file:///backend/llm/provider.py) to incorporate delivery time negotiations or volume tiered pricing.

---

## 📄 License

MIT License. Designed for hackathons and pharmacy supply chain automation.
