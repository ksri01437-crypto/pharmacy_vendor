import json
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from backend.database.models import PurchaseOrder, NegotiationRecord
from backend.services.inventory_service import update_stock


def create_purchase_order(
    db: Session,
    medicine: str,
    vendor: str,
    quantity: int,
    original_price: float,
    negotiated_price: float,
    delivery_days: int,
    status: str = "Confirmed",
    update_inventory_immediately: bool = True
) -> PurchaseOrder:
    """Generate a formal Purchase Order and persist to SQLite."""
    po_number = f"PO-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    total = round(quantity * negotiated_price, 2)

    order = PurchaseOrder(
        po_number=po_number,
        medicine=medicine,
        vendor=vendor,
        quantity=quantity,
        original_price=original_price,
        price=negotiated_price,
        total=total,
        delivery_days=delivery_days,
        status=status
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # Automatically replenish inventory stock when order is placed
    if update_inventory_immediately:
        update_stock(db, medicine, quantity)

    return order


def get_all_orders(db: Session) -> List[PurchaseOrder]:
    return db.query(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).all()


def record_negotiation(
    db: Session,
    po_number: Optional[str],
    medicine: str,
    vendor_name: str,
    initial_price: float,
    final_price: float,
    transcript: List[Dict[str, str]],
    status: str = "Accepted"
) -> NegotiationRecord:
    savings_pct = (
        round(((initial_price - final_price) / initial_price) * 100, 2)
        if initial_price > 0
        else 0.0
    )

    rec = NegotiationRecord(
        po_number=po_number,
        medicine=medicine,
        vendor_name=vendor_name,
        initial_price=initial_price,
        final_price=final_price,
        savings_pct=savings_pct,
        status=status,
        transcript=json.dumps(transcript)
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def get_all_negotiations(db: Session) -> List[Dict[str, Any]]:
    records = db.query(NegotiationRecord).order_by(NegotiationRecord.created_at.desc()).all()
    results = []
    for r in records:
        results.append({
            "id": r.id,
            "po_number": r.po_number,
            "medicine": r.medicine,
            "vendor_name": r.vendor_name,
            "initial_price": r.initial_price,
            "final_price": r.final_price,
            "savings_pct": r.savings_pct,
            "status": r.status,
            "transcript": json.loads(r.transcript) if r.transcript else [],
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return results


def clear_orders_and_negotiations(db: Session):
    db.query(PurchaseOrder).delete()
    db.query(NegotiationRecord).delete()
    db.commit()
