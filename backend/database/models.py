from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime
from backend.database.database import Base


class InventoryItem(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    medicine_name = Column(String(100), unique=True, nullable=False, index=True)
    current_stock = Column(Integer, default=0)
    reorder_threshold = Column(Integer, default=50)
    target_stock = Column(Integer, default=150)
    daily_sales = Column(Integer, default=10)
    expiry_date = Column(String(50), nullable=True)
    unit = Column(String(20), default="units")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    vendor_name = Column(String(100), nullable=False)
    medicine = Column(String(100), nullable=False, index=True)
    price = Column(Float, nullable=False)
    minimum_order_quantity = Column(Integer, default=1)
    delivery_days = Column(Integer, default=3)
    reliability_score = Column(Float, default=4.5)
    min_acceptable_price = Column(Float, nullable=False)
    negotiation_profile = Column(String(255), default="Standard supplier")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(50), unique=True, index=True)
    medicine = Column(String(100), nullable=False)
    vendor = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)
    original_price = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    delivery_days = Column(Integer, default=3)
    status = Column(String(50), default="Confirmed")
    created_at = Column(DateTime, default=datetime.utcnow)


class NegotiationRecord(Base):
    __tablename__ = "negotiations"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(50), nullable=True, index=True)
    medicine = Column(String(100), nullable=False)
    vendor_name = Column(String(100), nullable=False)
    initial_price = Column(Float, nullable=False)
    final_price = Column(Float, nullable=False)
    savings_pct = Column(Float, default=0.0)
    status = Column(String(50), default="Accepted")
    transcript = Column(Text, nullable=False)  # JSON serialized list of dialogue turns
    created_at = Column(DateTime, default=datetime.utcnow)
