from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from backend.database.database import engine, Base, get_db
from backend.database.models import InventoryItem, Vendor, PurchaseOrder, NegotiationRecord
from backend.services.inventory_service import (
    seed_inventory_if_empty,
    get_all_inventory,
    get_items_needing_restock,
    get_item_by_id,
    get_item_by_name
)
from backend.services.vendor_service import (
    seed_vendors_if_empty,
    get_all_vendors,
    get_vendors_for_medicine,
    compare_vendor_offers
)
from backend.services.order_service import (
    get_all_orders,
    get_all_negotiations,
    clear_orders_and_negotiations
)
from backend.agents.store_agent import RestockAgent

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Pharmacy Smart Restocking & Vendor Negotiation Agent API",
    version="1.1.0",
    description="Backend API powering autonomous pharmacy inventory restocking and vendor negotiation."
)

# Enable CORS for frontend Vite dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    """Seed initial sample data on application startup."""
    from backend.database.database import SessionLocal
    db = SessionLocal()
    try:
        seed_inventory_if_empty(db)
        seed_vendors_if_empty(db)
    finally:
        db.close()


# Pydantic schemas
class RestockRunRequest(BaseModel):
    medicine_id: Optional[int] = None
    medicine_name: Optional[str] = None


class DepleteRequest(BaseModel):
    medicine_id: Optional[int] = None
    medicine_name: Optional[str] = None
    deplete_by: int = 20


class CompareRequest(BaseModel):
    medicine_id: Optional[int] = None
    medicine_name: Optional[str] = None
    quantity: int = 100


# Endpoints
@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Pharmacy Smart Restocking Agent",
        "version": "1.1.0"
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/inventory")
def list_inventory(db: Session = Depends(get_db)):
    """Return all inventory items and restock status."""
    items = get_all_inventory(db)
    restock_candidates = {item["id"]: item for item in get_items_needing_restock(db)}

    response = []
    for it in items:
        is_low = it.id in restock_candidates
        candidate_info = restock_candidates.get(it.id, {})
        response.append({
            "id": it.id,
            "medicine_name": it.medicine_name,
            "current_stock": it.current_stock,
            "reorder_threshold": it.reorder_threshold,
            "target_stock": it.target_stock,
            "daily_sales": it.daily_sales,
            "expiry_date": it.expiry_date,
            "unit": it.unit,
            "is_low_stock": is_low,
            "recommended_quantity": candidate_info.get("recommended_quantity", 0),
            "reason": candidate_info.get("reason", "Stock is sufficient."),
            "days_of_stock_left": candidate_info.get("days_of_stock_left", round(it.current_stock / max(1, it.daily_sales), 1))
        })
    return response


@app.get("/api/restock/candidates")
def get_restock_candidates(db: Session = Depends(get_db)):
    """Return only the items currently below reorder threshold."""
    return get_items_needing_restock(db)


@app.get("/api/vendors")
def list_vendors(
    medicine: Optional[str] = None,
    medicine_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Return all vendors or filter by medicine_id / medicine name."""
    if medicine_id is not None or medicine:
        return get_vendors_for_medicine(db, medicine_name=medicine, medicine_id=medicine_id)
    return get_all_vendors(db)


@app.post("/api/vendors/compare")
def compare_vendors(req: CompareRequest, db: Session = Depends(get_db)):
    """Compare and rank vendors offering a specific medicine."""
    vendors = get_vendors_for_medicine(db, medicine_name=req.medicine_name, medicine_id=req.medicine_id)
    if not vendors:
        label = req.medicine_name or f"ID {req.medicine_id}"
        raise HTTPException(status_code=404, detail=f"No vendors found for '{label}'")
    return compare_vendor_offers(vendors, req.quantity)


@app.post("/api/agent/run")
def trigger_agent(req: RestockRunRequest = RestockRunRequest(), db: Session = Depends(get_db)):
    """
    Execute the Store Restocking Agent cycle:
    OBSERVE -> DECIDE -> ACT -> OBSERVE RESULT -> DECIDE AGAIN -> COMPLETE
    If medicine_id or medicine_name is provided, restocks ONLY that item.
    If not provided, restocks ALL items currently below threshold.
    """
    agent = RestockAgent(db=db)
    result = agent.run_restocking_cycle(
        target_medicine=req.medicine_name,
        target_medicine_id=req.medicine_id
    )
    return result


@app.get("/api/orders")
def list_orders(medicine_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Return all confirmed purchase orders, optionally filtered by medicine_id."""
    orders = get_all_orders(db)
    if medicine_id is not None:
        orders = [o for o in orders if o.medicine_id == medicine_id]
    return orders


@app.get("/api/negotiations")
def list_negotiations(medicine_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Return all negotiation records and conversation transcripts."""
    records = get_all_negotiations(db)
    if medicine_id is not None:
        records = [r for r in records if r.get("medicine_id") == medicine_id]
    return records


@app.post("/api/demo/reset")
def reset_demo_data(db: Session = Depends(get_db)):
    """Reset inventory and vendor data to initial baseline, clear orders and negotiation logs."""
    clear_orders_and_negotiations(db)
    seed_inventory_if_empty(db, force_reset=True)
    seed_vendors_if_empty(db, force_reset=True)
    return {"message": "Demo data successfully reset to baseline."}


@app.post("/api/demo/deplete")
def deplete_stock(req: DepleteRequest, db: Session = Depends(get_db)):
    """Artificially lower stock to demonstrate restocking workflow for any medicine."""
    item = None
    if req.medicine_id is not None:
        item = get_item_by_id(db, req.medicine_id)
    if not item and req.medicine_name:
        item = get_item_by_name(db, req.medicine_name)

    if not item:
        raise HTTPException(status_code=404, detail="Medicine not found")

    item.current_stock = max(0, item.current_stock - req.deplete_by)
    db.commit()
    db.refresh(item)
    return {
        "id": item.id,
        "medicine_name": item.medicine_name,
        "new_stock": item.current_stock,
        "reorder_threshold": item.reorder_threshold,
        "is_low_stock": item.current_stock <= item.reorder_threshold
    }
