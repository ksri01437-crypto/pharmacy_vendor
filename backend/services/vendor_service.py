import json
import os
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.database.models import Vendor


def seed_vendors_if_empty(db: Session, force_reset: bool = False):
    """Seed vendors from JSON if table is empty or if force_reset is True."""
    count = db.query(Vendor).count()
    if count > 0 and not force_reset:
        return

    if force_reset:
        db.query(Vendor).delete()
        db.commit()

    json_path = os.path.join(os.path.dirname(__file__), "..", "data", "vendors.json")
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data:
                v = Vendor(
                    id=item.get("id"),
                    medicine_id=item.get("medicine_id"),
                    vendor_name=item["vendor_name"],
                    medicine=item["medicine"],
                    price=item["price"],
                    minimum_order_quantity=item.get("minimum_order_quantity", 1),
                    delivery_days=item.get("delivery_days", 3),
                    reliability_score=item.get("reliability_score", 4.5),
                    min_acceptable_price=item.get("min_acceptable_price", item["price"] * 0.9),
                    negotiation_profile=item.get("negotiation_profile", "Standard supplier")
                )
                db.add(v)
            db.commit()


def get_all_vendors(db: Session) -> List[Vendor]:
    return db.query(Vendor).all()


def get_vendors_for_medicine(
    db: Session,
    medicine_name: Optional[str] = None,
    medicine_id: Optional[int] = None
) -> List[Vendor]:
    """Retrieve vendors filtering by medicine_id first, falling back to medicine_name."""
    if medicine_id is not None:
        vendors = db.query(Vendor).filter(Vendor.medicine_id == medicine_id).all()
        if vendors:
            return vendors
    if medicine_name:
        return db.query(Vendor).filter(Vendor.medicine.ilike(medicine_name.strip())).all()
    return []


def get_vendor_by_name_and_medicine(
    db: Session,
    vendor_name: str,
    medicine_name: Optional[str] = None,
    medicine_id: Optional[int] = None
) -> Optional[Vendor]:
    query = db.query(Vendor).filter(Vendor.vendor_name == vendor_name)
    if medicine_id is not None:
        v = query.filter(Vendor.medicine_id == medicine_id).first()
        if v:
            return v
    if medicine_name:
        return query.filter(Vendor.medicine.ilike(medicine_name.strip())).first()
    return query.first()


def compare_vendor_offers(vendors: List[Vendor], requested_qty: int) -> List[Dict[str, Any]]:
    """
    Compare vendor offers for a given quantity.
    Calculates effective quantity (respecting MOQ), total cost, delivery speed, and comparative score.
    Score formula weights:
      - Price (50%)
      - Delivery speed (30%)
      - Reliability (20%)
    """
    if not vendors:
        return []

    evaluations = []
    prices = [v.price for v in vendors]
    min_price = min(prices)
    max_price = max(prices) if max(prices) != min_price else min_price + 1

    deliveries = [v.delivery_days for v in vendors]
    min_delivery = min(deliveries)
    max_delivery = max(deliveries) if max(deliveries) != min_delivery else min_delivery + 1

    for v in vendors:
        effective_qty = max(requested_qty, v.minimum_order_quantity)
        total_initial_cost = round(effective_qty * v.price, 2)
        moq_penalty = 1.0 if requested_qty >= v.minimum_order_quantity else (requested_qty / v.minimum_order_quantity)

        price_score = 1.0 - ((v.price - min_price) / (max_price - min_price) if max_price > min_price else 0.0)
        delivery_score = 1.0 - ((v.delivery_days - min_delivery) / (max_delivery - min_delivery) if max_delivery > min_delivery else 0.0)
        reliability_score = v.reliability_score / 5.0

        composite_score = round(
            (0.50 * price_score + 0.30 * delivery_score + 0.20 * reliability_score) * (0.8 + 0.2 * moq_penalty),
            3
        )

        evaluations.append({
            "vendor_id": v.id,
            "medicine_id": v.medicine_id,
            "vendor_name": v.vendor_name,
            "medicine": v.medicine,
            "unit_price": v.price,
            "min_acceptable_price": v.min_acceptable_price,
            "moq": v.minimum_order_quantity,
            "delivery_days": v.delivery_days,
            "reliability_score": v.reliability_score,
            "negotiation_profile": v.negotiation_profile,
            "requested_qty": requested_qty,
            "effective_qty": effective_qty,
            "moq_satisfied": requested_qty >= v.minimum_order_quantity,
            "total_initial_cost": total_initial_cost,
            "score": composite_score,
            "is_recommended": False
        })

    evaluations.sort(key=lambda x: x["score"], reverse=True)
    if evaluations:
        evaluations[0]["is_recommended"] = True

    return evaluations
