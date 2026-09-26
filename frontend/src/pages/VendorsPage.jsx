import React, { useState } from 'react';

export default function VendorsPage({ vendors, inventory, setActivePage, setSelectedMedicineId, onRunAgent, isRunning }) {
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('all');
  const [selectedMedFilter, setSelectedMedFilter] = useState('all');

  const vendorNames = Array.from(new Set(vendors.map((v) => v.vendor_name)));
  const medicineNames = Array.from(new Set(vendors.map((v) => v.medicine)));

  const filteredVendors = vendors.filter((v) => {
    if (selectedVendorFilter !== 'all' && v.vendor_name !== selectedVendorFilter) return false;
    if (selectedMedFilter !== 'all' && v.medicine !== selectedMedFilter) return false;
    return true;
  });

  return (
    <div className="page-container">
      {/* Header Bar */}
      <div className="page-header-bar">
        <div>
          <h2>🏪 Registered Supplier & Vendor Network</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
            Verified pharmaceutical distributors, wholesale price books, MOQ rules, and delivery commitments.
          </p>
        </div>

        <div className="filter-bar">
          <select
            className="search-input"
            style={{ width: 'auto' }}
            value={selectedMedFilter}
            onChange={(e) => setSelectedMedFilter(e.target.value)}
          >
            <option value="all">All Medicines ({medicineNames.length})</option>
            {medicineNames.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            className="search-input"
            style={{ width: 'auto' }}
            value={selectedVendorFilter}
            onChange={(e) => setSelectedVendorFilter(e.target.value)}
          >
            <option value="all">All Suppliers ({vendorNames.length})</option>
            {vendorNames.map((vn) => (
              <option key={vn} value={vn}>
                {vn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Supplier Overview Cards */}
      <div className="card-grid" style={{ marginBottom: '32px' }}>
        {vendorNames.map((name) => {
          const supplierQuotes = vendors.filter((v) => v.vendor_name === name);
          const avgScore = (
            supplierQuotes.reduce((sum, q) => sum + q.reliability_score, 0) / (supplierQuotes.length || 1)
          ).toFixed(1);
          const minDelivery = Math.min(...supplierQuotes.map((q) => q.delivery_days));

          return (
            <div key={name} className="vendor-card">
              <div>
                <div className="vendor-header">
                  <div>
                    <h3>{name}</h3>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {supplierQuotes.length} Catalog Offerings
                    </span>
                  </div>
                  <span className="vendor-badge">⭐ {avgScore} / 5.0</span>
                </div>

                <div className="vendor-metrics">
                  <div className="vendor-metric-item">
                    <div className="val">{minDelivery}d</div>
                    <div className="lbl">Fastest Delivery</div>
                  </div>
                  <div className="vendor-metric-item">
                    <div className="val">{supplierQuotes.length}</div>
                    <div className="lbl">Active Quotes</div>
                  </div>
                  <div className="vendor-metric-item">
                    <div className="val" style={{ color: '#10b981' }}>Active</div>
                    <div className="lbl">Contract Status</div>
                  </div>
                </div>

                <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
                  {supplierQuotes[0]?.negotiation_profile || 'Standard verified pharmaceutical wholesaler.'}
                </p>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.75rem', padding: '6px' }}
                  onClick={() => setSelectedVendorFilter(name === selectedVendorFilter ? 'all' : name)}
                >
                  {selectedVendorFilter === name ? 'Clear Filter' : 'Filter Products'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Quotation Registry Table */}
      <div className="panel">
        <div className="panel-header">
          <h3>Active Supplier Quotations & Pricing Books</h3>
          <span className="badge">Showing {filteredVendors.length} Quotes</span>
        </div>

        {filteredVendors.length === 0 ? (
          <div className="empty-state">
            <p>No supplier quotations match the selected filters.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Vendor Partner</th>
                  <th>Medicine</th>
                  <th>Listed Wholesale Price</th>
                  <th>Min Acceptable Price</th>
                  <th>MOQ</th>
                  <th>Transit SLA</th>
                  <th>Reliability</th>
                  <th>Negotiation Concession Profile</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((v) => {
                  const invItem = inventory.find((it) => it.id === v.medicine_id || it.medicine_name === v.medicine);
                  const isLow = invItem?.is_low_stock;

                  return (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 600 }}>{v.vendor_name}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#f8fafc' }}>{v.medicine}</span>
                        {isLow && (
                          <span className="status-pill low" style={{ marginLeft: '8px', fontSize: '0.68rem' }}>
                            Low Stock Alert
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>₹{v.price.toFixed(2)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                        ₹{v.min_acceptable_price.toFixed(2)}
                      </td>
                      <td>{v.minimum_order_quantity} units</td>
                      <td>{v.delivery_days} days</td>
                      <td>
                        <span style={{ color: '#fbbf24', fontWeight: 600 }}>⭐ {v.reliability_score}</span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#94a3b8', maxWidth: '280px' }}>
                        {v.negotiation_profile}
                      </td>
                      <td>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                          onClick={() => {
                            if (invItem) {
                              setSelectedMedicineId(invItem.id);
                              onRunAgent(invItem.id, invItem.medicine_name);
                            }
                            setActivePage('dashboard');
                          }}
                          disabled={isRunning}
                        >
                          ⚡ Restock
                        </button>
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
