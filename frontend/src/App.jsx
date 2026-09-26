import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import VendorsPage from './pages/VendorsPage';
import OrdersPage from './pages/OrdersPage';
import NegotiationsPage from './pages/NegotiationsPage';

const API_BASE = 'http://127.0.0.1:8000';

export default function App() {
  const [activePage, setActivePage] = useState('home'); // 'home', 'dashboard', 'inventory', 'vendors', 'orders', 'negotiations'
  const [inventory, setInventory] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [negotiations, setNegotiations] = useState([]);
  const [agentLogs, setAgentLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedMedicineId, setSelectedMedicineId] = useState(null);
  const [lastProcessed, setLastProcessed] = useState(null);

  // Load all data on mount
  useEffect(() => {
    fetchDashboardData(true);
  }, []);

  const fetchDashboardData = async (initialLoad = false) => {
    try {
      const [invRes, venRes, ordRes, negRes] = await Promise.all([
        fetch(`${API_BASE}/api/inventory`),
        fetch(`${API_BASE}/api/vendors`),
        fetch(`${API_BASE}/api/orders`),
        fetch(`${API_BASE}/api/negotiations`)
      ]);

      let invData = [];
      if (invRes.ok) {
        invData = await invRes.json();
        setInventory(invData);
      }
      if (venRes.ok) setVendors(await venRes.json());
      if (ordRes.ok) setOrders(await ordRes.json());
      if (negRes.ok) setNegotiations(await negRes.json());

      // Auto-select first low-stock item
      if (initialLoad && invData.length > 0) {
        const firstLow = invData.find((item) => item.is_low_stock);
        if (firstLow) {
          setSelectedMedicineId(firstLow.id);
        } else {
          setSelectedMedicineId(invData[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
  };

  // Derive the active selected medicine item (never hardcoded)
  const selectedItem =
    inventory.find((it) => it.id === selectedMedicineId) ||
    inventory.find((it) => it.is_low_stock) ||
    inventory[0] ||
    null;

  // Run the autonomous agent loop (targeted or global)
  const runAgent = async (targetMedicineId = null, targetMedicineName = null) => {
    setIsRunning(true);
    if (targetMedicineId) {
      setSelectedMedicineId(targetMedicineId);
    }
    try {
      const payload = {};
      if (targetMedicineId) payload.medicine_id = targetMedicineId;
      if (targetMedicineName) payload.medicine_name = targetMedicineName;

      const res = await fetch(`${API_BASE}/api/agent/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.logs) {
        setAgentLogs(data.logs);
      }
      if (data.processed_items && data.processed_items.length > 0) {
        setLastProcessed(data.processed_items[0]);
        setSelectedMedicineId(data.processed_items[0].medicine_id);
      }
      await fetchDashboardData(false);
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
      await fetchDashboardData(true);
    } catch (err) {
      console.error('Error resetting demo:', err);
    }
  };

  // Simulate usage/depletion of medicine
  const depleteStock = async (medicineId, medicineName, amount = 20) => {
    try {
      await fetch(`${API_BASE}/api/demo/deplete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicine_id: medicineId, medicine_name: medicineName, deplete_by: amount })
      });
      setSelectedMedicineId(medicineId);
      await fetchDashboardData(false);
    } catch (err) {
      console.error('Error depleting stock:', err);
    }
  };

  const lowStockCount = inventory.filter((item) => item.is_low_stock).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Global Top Navbar */}
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        isRunning={isRunning}
        onRunAgent={runAgent}
        onResetDemo={resetDemo}
        lowStockCount={lowStockCount}
      />

      {/* Main Page Rendering */}
      <main style={{ flex: 1 }}>
        {activePage === 'home' && (
          <LandingPage
            setActivePage={setActivePage}
            onRunAgent={runAgent}
            isRunning={isRunning}
            lowStockCount={lowStockCount}
          />
        )}

        {activePage === 'dashboard' && (
          <DashboardPage
            inventory={inventory}
            vendors={vendors}
            orders={orders}
            negotiations={negotiations}
            agentLogs={agentLogs}
            isRunning={isRunning}
            selectedItem={selectedItem}
            setSelectedMedicineId={setSelectedMedicineId}
            runAgent={runAgent}
            resetDemo={resetDemo}
            depleteStock={depleteStock}
            lastProcessed={lastProcessed}
          />
        )}

        {activePage === 'inventory' && (
          <InventoryPage
            inventory={inventory}
            onRunAgent={runAgent}
            depleteStock={depleteStock}
            isRunning={isRunning}
            setActivePage={setActivePage}
            setSelectedMedicineId={setSelectedMedicineId}
          />
        )}

        {activePage === 'vendors' && (
          <VendorsPage
            vendors={vendors}
            inventory={inventory}
            setActivePage={setActivePage}
            setSelectedMedicineId={setSelectedMedicineId}
            onRunAgent={runAgent}
            isRunning={isRunning}
          />
        )}

        {activePage === 'orders' && (
          <OrdersPage
            orders={orders}
            negotiations={negotiations}
            setActivePage={setActivePage}
          />
        )}

        {activePage === 'negotiations' && (
          <NegotiationsPage
            negotiations={negotiations}
            setActivePage={setActivePage}
          />
        )}
      </main>
    </div>
  );
}
