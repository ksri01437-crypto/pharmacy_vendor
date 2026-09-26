import React from 'react';

export default function ExplainableAgentCard({ item, onRestock, isRunning }) {
  if (!item) return null;

  const currentStock = item.current_stock ?? item.explainability?.current_stock ?? 0;
  const reorderLevel = item.reorder_threshold ?? item.explainability?.reorder_threshold ?? 0;
  const dailySales = item.daily_sales ?? item.explainability?.daily_sales ?? 10;
  const recommendedQty = item.recommended_quantity ?? item.explainability?.recommended_quantity ?? 100;
  const daysRemaining = item.days_of_stock_left ?? item.explainability?.days_remaining_num ?? round(currentStock / Math.max(1, dailySales), 1);
  const reason = item.explainability?.reason || item.reason || (daysRemaining <= 1.5 ? "High demand + low stock" : "Stock below reorder threshold");
  const priorityCircle = item.priority_circle || item.explainability?.priority_circle || (daysRemaining <= 1.5 ? "🔴" : "🟠");
  const priorityLevel = item.priority_level || item.explainability?.priority_level || (daysRemaining <= 1.5 ? "CRITICAL" : "HIGH");
  const priorityScore = item.priority_score || item.explainability?.priority_score || (daysRemaining <= 1.5 ? 94.0 : 80.0);

  return (
    <div className="explain-card">
      <div className="explain-header">
        <h4>
          <span>🤖 Explainable Agent:</span> {item.medicine_name} → <span style={{ color: '#38bdf8' }}>Order {recommendedQty}</span>
        </h4>
        <span className={`priority-pill priority-${priorityLevel}`}>
          {priorityCircle} {priorityLevel} ({priorityScore})
        </span>
      </div>

      <div style={{ marginBottom: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
        Why?
      </div>

      <div className="explain-grid">
        <div className="explain-item">
          <div className="lbl">Current Stock</div>
          <div className="val">{currentStock} {item.unit || 'units'}</div>
        </div>

        <div className="explain-item">
          <div className="lbl">Reorder Level</div>
          <div className="val">{reorderLevel} {item.unit || 'units'}</div>
        </div>

        <div className="explain-item">
          <div className="lbl">Daily Sales</div>
          <div className="val">{dailySales}/day</div>
        </div>

        <div className="explain-item">
          <div className="lbl">Estimated Stock Remaining</div>
          <div className="val" style={{ color: daysRemaining <= 1.5 ? '#fb7185' : '#fb923c' }}>
            {daysRemaining} days
          </div>
        </div>

        <div className="explain-item">
          <div className="lbl">Recommended Quantity</div>
          <div className="val" style={{ color: '#38bdf8' }}>
            +{recommendedQty} {item.unit || 'units'}
          </div>
        </div>

        <div className="explain-item" style={{ gridColumn: 'span 2' }}>
          <div className="lbl">Agent Diagnosis & Reason</div>
          <div className="val" style={{ color: '#34d399', fontSize: '0.86rem' }}>
            {reason}
          </div>
        </div>
      </div>

      {onRestock && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            onClick={() => onRestock(item.id, item.medicine_name)}
            disabled={isRunning}
          >
            ⚡ Restock {item.medicine_name} ({recommendedQty})
          </button>
        </div>
      )}
    </div>
  );
}

function round(val, decimals = 1) {
  return Number(Math.round(val + 'e' + decimals) + 'e-' + decimals);
}
