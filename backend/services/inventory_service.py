import json
import os
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.database.models import InventoryItem


def seed_inventory_if_empty(db: Session, force_reset: bool = False):
    """Seed inventory from JSON if table is empty or if force_reset is True."""
    count = db.query(InventoryItem).count()
    if count > 0 and not force_reset:
        return

    if force_reset:
        db.query(InventoryItem).delete()
        db.commit()

    json_path = os.path.join(os.path.dirname(__file__), "..", "data", "inventory.json")
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data:
                db_item = InventoryItem(
                    id=item.get("id"),
                    medicine_name=item["medicine_name"],
                    current_stock=item["current_stock"],
                    reorder_threshold=item["reorder_threshold"],
                    target_stock=item.get("target_stock", item["reorder_threshold"] * 3),
                    daily_sales=item.get("daily_sales", 10),
                    expiry_date=item.get("expiry_date", "2027-12-31"),
                    unit=item.get("unit", "units"),
                )
                db.add(db_item)
            db.commit()


def get_all_inventory(db: Session) -> List[InventoryItem]:
    return db.query(InventoryItem).order_by(InventoryItem.id.asc()).all()


def get_item_by_id(db: Session, item_id: int) -> Optional[InventoryItem]:
    return db.query(InventoryItem).filter(InventoryItem.id == item_id).first()


def get_item_by_name(db: Session, medicine_name: str) -> Optional[InventoryItem]:
    return db.query(InventoryItem).filter(InventoryItem.medicine_name == medicine_name).first()


def get_items_needing_restock(db: Session) -> List[Dict[str, Any]]:
    """Identify medicines where current_stock is at or below reorder_threshold."""
    items = db.query(InventoryItem).all()
    restock_list = []
    for item in items:
        if item.current_stock <= item.reorder_threshold:
            deficit = max(0, item.target_stock - item.current_stock)
            safety_buffer = item.daily_sales * 7
            recommended_qty = max(deficit, safety_buffer)

            # Round to nearest 10 for standard packaging
            recommended_qty = int(((recommended_qty + 9) // 10) * 10)

            days_remaining = (
                round(item.current_stock / item.daily_sales, 1)
                if item.daily_sales > 0
                else 999
            )

            restock_list.append({
                "id": item.id,
                "medicine_name": item.medicine_name,
                "current_stock": item.current_stock,
                "reorder_threshold": item.reorder_threshold,
                "target_stock": item.target_stock,
                "daily_sales": item.daily_sales,
                "recommended_quantity": recommended_qty,
                "days_of_stock_left": days_remaining,
                "unit": item.unit,
                "reason": f"Current stock ({item.current_stock} {item.unit}) is below reorder threshold ({item.reorder_threshold} {item.unit}). Est. {days_remaining} days remaining."
            })
    return restock_list


def update_stock(
    db: Session,
    medicine_name: Optional[str] = None,
    quantity_to_add: int = 0,
    medicine_id: Optional[int] = None
) -> Optional[InventoryItem]:
    """Update stock quantity for a medicine by ID or by name."""
    item = None
    if medicine_id is not None:
        item = get_item_by_id(db, medicine_id)
    if not item and medicine_name:
        item = get_item_by_name(db, medicine_name)

    if item:
        item.current_stock += quantity_to_add
        db.commit()
        db.refresh(item)
    return item
