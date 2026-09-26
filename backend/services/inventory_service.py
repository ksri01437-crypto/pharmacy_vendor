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


def compute_priority_and_explanation(
    current_stock: int,
    reorder_threshold: int,
    target_stock: int,
    daily_sales: int,
    unit: str = "units"
) -> Dict[str, Any]:
    """
    Computes Medicine Priority Score and the 'Why did I order this?' explainability payload.
    Priority Rules:
      - Stock < 1.5 days or 0: CRITICAL (🔴 red circle, score 95-100)
      - Stock < 3.0 days: HIGH (🟠 orange circle, score 75-90)
      - Stock <= threshold: MEDIUM (🟡 yellow circle, score 50-70)
      - Stock > threshold: LOW / HEALTHY (🟢 green circle, score 10-30)
    """
    days_remaining = round(current_stock / max(1, daily_sales), 1)

    deficit = max(0, target_stock - current_stock)
    safety_buffer = daily_sales * 7
    recommended_qty = max(deficit, safety_buffer)
    # Round to nearest 10 for standard packaging
    recommended_qty = int(((recommended_qty + 9) // 10) * 10)

    is_low_stock = current_stock <= reorder_threshold

    if days_remaining <= 1.5:
        priority_level = "CRITICAL"
        priority_circle = "🔴"
        priority_score = round(max(90.0, 100.0 - (days_remaining * 5)), 1)
        reason = "High demand + low stock"
    elif days_remaining <= 3.0:
        priority_level = "HIGH"
        priority_circle = "🟠"
        priority_score = round(max(75.0, 90.0 - (days_remaining * 5)), 1)
        reason = "Accelerated depletion below reorder threshold"
    elif is_low_stock:
        priority_level = "MEDIUM"
        priority_circle = "🟡"
        priority_score = 60.0
        reason = f"Current stock breached safety threshold ({reorder_threshold} {unit})"
    else:
        priority_level = "HEALTHY"
        priority_circle = "🟢"
        priority_score = 20.0
        reason = "Stock buffer optimal, no replenishment required"

    return {
        "current_stock": current_stock,
        "reorder_threshold": reorder_threshold,
        "target_stock": target_stock,
        "daily_sales": daily_sales,
        "daily_sales_label": f"{daily_sales}/day",
        "estimated_stock_remaining": f"{days_remaining} days",
        "days_remaining_num": days_remaining,
        "recommended_quantity": recommended_qty,
        "is_low_stock": is_low_stock,
        "priority_level": priority_level,
        "priority_score": priority_score,
        "priority_circle": priority_circle,
        "reason": reason,
        "explanation_summary": (
            f"Why did I order this?\n"
            f"• Current stock: {current_stock} {unit}\n"
            f"• Reorder level: {reorder_threshold} {unit}\n"
            f"• Daily sales: {daily_sales}/day\n"
            f"• Estimated stock remaining: {days_remaining} days\n"
            f"• Recommended quantity: {recommended_qty} {unit}\n"
            f"• Reason: {reason}"
        )
    }


def get_items_needing_restock(db: Session) -> List[Dict[str, Any]]:
    """Identify medicines where current_stock is at or below reorder_threshold and rank by priority."""
    items = db.query(InventoryItem).all()
    restock_list = []
    for item in items:
        if item.current_stock <= item.reorder_threshold:
            meta = compute_priority_and_explanation(
                current_stock=item.current_stock,
                reorder_threshold=item.reorder_threshold,
                target_stock=item.target_stock,
                daily_sales=item.daily_sales,
                unit=item.unit
            )

            restock_list.append({
                "id": item.id,
                "medicine_name": item.medicine_name,
                "current_stock": item.current_stock,
                "reorder_threshold": item.reorder_threshold,
                "target_stock": item.target_stock,
                "daily_sales": item.daily_sales,
                "recommended_quantity": meta["recommended_quantity"],
                "days_of_stock_left": meta["days_remaining_num"],
                "unit": item.unit,
                "priority_level": meta["priority_level"],
                "priority_score": meta["priority_score"],
                "priority_circle": meta["priority_circle"],
                "reason": meta["reason"],
                "explainability": meta
            })

    # Sort descending by priority_score (Critical first!)
    restock_list.sort(key=lambda x: x["priority_score"], reverse=True)
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
