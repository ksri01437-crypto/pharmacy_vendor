from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from backend.services.inventory_service import (
    get_items_needing_restock,
    get_all_inventory,
    get_item_by_id,
    get_item_by_name
)
from backend.services.vendor_service import (
    get_vendors_for_medicine,
    compare_vendor_offers
)
from backend.services.order_service import (
    create_purchase_order,
    record_negotiation
)
from backend.llm.provider import get_negotiator


class RestockAgent:
    """
    Main Pharmacy Store Agent responsible for automated restocking and vendor negotiation.
    Follows the Agentic Loop:
    [OBSERVE] -> [DECIDE] -> [ACT] -> [OBSERVE RESULT] -> [DECIDE AGAIN] -> [COMPLETE]
    Operates strictly per medicine ID and name.
    """

    def __init__(self, db: Session):
        self.db = db
        self.negotiator = get_negotiator()
        self.logs: List[Dict[str, Any]] = []

    def _log(self, phase: str, message: str, details: Optional[Dict[str, Any]] = None):
        """Append a structured activity step to the agent trace."""
        entry = {
            "timestamp": datetime.utcnow().strftime("%H:%M:%S"),
            "phase": phase,
            "message": message,
            "details": details or {}
        }
        self.logs.append(entry)

    def run_restocking_cycle(
        self,
        target_medicine: Optional[str] = None,
        target_medicine_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Executes the complete end-to-end restocking and negotiation workflow.
        Can be targeted at a specific medicine (by ID or name) or run over all deficit inventory items.
        Healthy items above reorder thresholds are strictly excluded.
        """
        self.logs = []
        self._log("OBSERVE", "Initiating store scan. Inspecting current pharmacy inventory levels...")

        all_inventory = get_all_inventory(self.db)
        all_needing_restock = get_items_needing_restock(self.db)

        # Filter strictly for target if specified
        if target_medicine_id is not None:
            target_items = [it for it in all_needing_restock if it["id"] == target_medicine_id]
            if not target_items:
                # Check if item exists in inventory but is healthy
                existing_item = get_item_by_id(self.db, target_medicine_id)
                if existing_item:
                    self._log(
                        "OBSERVE",
                        f"Item '{existing_item.medicine_name}' (ID: {existing_item.id}) has {existing_item.current_stock} {existing_item.unit}, which is above reorder threshold ({existing_item.reorder_threshold}). Stock is healthy. Restocking skipped."
                    )
                    return {
                        "status": "ITEM_ALREADY_HEALTHY",
                        "logs": self.logs,
                        "processed_items": [],
                        "orders_generated": []
                    }
            needing_restock = target_items
        elif target_medicine:
            target_clean = target_medicine.strip().lower()
            target_items = [it for it in all_needing_restock if it["medicine_name"].strip().lower() == target_clean]
            if not target_items:
                existing_item = get_item_by_name(self.db, target_medicine)
                if existing_item:
                    self._log(
                        "OBSERVE",
                        f"Item '{existing_item.medicine_name}' has {existing_item.current_stock} {existing_item.unit}, which is above reorder threshold ({existing_item.reorder_threshold}). Stock is healthy. Restocking skipped."
                    )
                    return {
                        "status": "ITEM_ALREADY_HEALTHY",
                        "logs": self.logs,
                        "processed_items": [],
                        "orders_generated": []
                    }
            needing_restock = target_items
        else:
            # All items currently requiring restocking
            needing_restock = all_needing_restock

        low_stock_names = ", ".join([item["medicine_name"] for item in needing_restock])
        self._log(
            "OBSERVE",
            f"Inventory scan complete. Total catalog items: {len(all_inventory)}. Low-stock medicines requiring restocking: {len(needing_restock)} ({low_stock_names or 'None'}).",
            {"low_stock_count": len(needing_restock)}
        )

        if not needing_restock:
            self._log("COMPLETE", "All inventory items are currently healthy above reorder thresholds. No restock needed.")
            return {
                "status": "NO_ACTION_REQUIRED",
                "logs": self.logs,
                "processed_items": [],
                "orders_generated": []
            }

        processed_items = []
        generated_orders = []

        # Process each deficit item independently
        for item in needing_restock:
            med_id = item["id"]
            med_name = item["medicine_name"]
            curr_stock = item["current_stock"]
            threshold = item["reorder_threshold"]
            req_qty = item["recommended_quantity"]

            # 2. DECIDE: Calculate Required Quantity & Priority Rationale
            priority_circle = item.get("priority_circle", "🔴" if item.get("days_of_stock_left", 99) < 1.5 else "🟠")
            priority_level = item.get("priority_level", "CRITICAL" if item.get("days_of_stock_left", 99) < 1.5 else "HIGH")
            priority_score = item.get("priority_score", 95.0 if priority_level == "CRITICAL" else 80.0)
            days_left = item.get("days_of_stock_left", round(curr_stock / max(1, item["daily_sales"]), 1))
            reason = item.get("reason", "High demand + low stock")

            self._log(
                "DECIDE",
                f"[{med_name}] Priority: {priority_circle} {priority_level} (Score: {priority_score}/100). Current stock: {curr_stock} {item['unit']} (≤ reorder threshold {threshold} {item['unit']}). Est. remaining: {days_left} days.",
                {"medicine_id": med_id, "medicine": med_name, "priority_level": priority_level, "priority_score": priority_score, "days_left": days_left}
            )
            self._log(
                "DECIDE",
                f"[{med_name}] Why did I order this? Current stock: {curr_stock} | Reorder level: {threshold} | Daily sales: {item['daily_sales']}/day | Stock remaining: {days_left} days | Recommended qty: {req_qty} | Reason: {reason}.",
                {"medicine_id": med_id, "recommended_quantity": req_qty, "reason": reason}
            )

            # 3. ACT: Request Vendor Offers strictly for this medicine
            self._log("ACT", f"[{med_name}] Querying vendor network for supply offers of {med_name} (Qty: {req_qty})...")
            available_vendors = get_vendors_for_medicine(self.db, medicine_name=med_name, medicine_id=med_id)

            if not available_vendors:
                self._log("OBSERVE RESULT", f"[{med_name}] Warning: No registered vendors found supplying {med_name}. Skipping to next item.")
                continue

            vendor_names = ", ".join([v.vendor_name for v in available_vendors])
            self._log("OBSERVE RESULT", f"[{med_name}] Found {len(available_vendors)} active vendors: {vendor_names}.")

            # 4. DECIDE: Compare Vendors & Score Offers
            self._log("DECIDE", f"[{med_name}] Evaluating quotes against price, delivery transit, MOQ requirements, and reliability...")
            comparison = compare_vendor_offers(available_vendors, req_qty)

            selected_candidate = comparison[0] if comparison else None
            if not selected_candidate:
                self._log("OBSERVE RESULT", f"[{med_name}] Failed to match any valid vendor quotation.")
                continue

            self._log(
                "DECIDE",
                f"[{med_name}] Best candidate selected: {selected_candidate['vendor_name']} (Listed Unit Price: ₹{selected_candidate['unit_price']:.2f}, Delivery: {selected_candidate['delivery_days']} days, MOQ: {selected_candidate['moq']}).",
                {"candidate": selected_candidate}
            )

            # 5. ACT: Negotiate with Candidate Vendor specifically for this medicine
            order_qty = selected_candidate["effective_qty"]
            initial_price = selected_candidate["unit_price"]
            min_price = selected_candidate["min_acceptable_price"]

            self._log(
                "ACT",
                f"[{med_name}] Initiating autonomous negotiation with {selected_candidate['vendor_name']} for {order_qty} units of {med_name} (Base price: ₹{initial_price:.2f}/unit)..."
            )

            negotiation_res = self.negotiator.negotiate(
                medicine=med_name,
                quantity=order_qty,
                vendor_name=selected_candidate["vendor_name"],
                initial_price=initial_price,
                min_acceptable_price=min_price,
                profile_notes=selected_candidate["negotiation_profile"]
            )

            final_price = negotiation_res["final_price"]
            savings_pct = round(((initial_price - final_price) / initial_price) * 100, 1)

            # 6. OBSERVE RESULT: Analyze Negotiation Outcome
            self._log(
                "OBSERVE RESULT",
                f"[{med_name}] Negotiation concluded with {selected_candidate['vendor_name']}. Final agreed price: ₹{final_price:.2f}/unit for {med_name} (Saved ₹{initial_price - final_price:.2f}/unit or {savings_pct}%).",
                {"medicine": med_name, "final_price": final_price, "savings_pct": savings_pct}
            )

            # 7. DECIDE AGAIN: Final Deal Authorization
            self._log(
                "DECIDE",
                f"[{med_name}] Terms validated. Authorizing automated Purchase Order generation for {order_qty} units of {med_name} at ₹{final_price:.2f}/unit."
            )

            # 8. COMPLETE: Issue Purchase Order & Replenish this specific medicine in Inventory
            po = create_purchase_order(
                db=self.db,
                medicine_id=med_id,
                medicine=med_name,
                vendor=selected_candidate["vendor_name"],
                quantity=order_qty,
                original_price=initial_price,
                negotiated_price=final_price,
                delivery_days=selected_candidate["delivery_days"],
                status="Confirmed",
                update_inventory_immediately=True
            )

            # Record negotiation dialogue transcript in SQLite
            record_negotiation(
                db=self.db,
                po_number=po.po_number,
                medicine_id=med_id,
                medicine=med_name,
                vendor_name=selected_candidate["vendor_name"],
                initial_price=initial_price,
                final_price=final_price,
                transcript=negotiation_res["transcript"],
                status="Accepted"
            )

            updated_item = get_item_by_id(self.db, med_id) or get_item_by_name(self.db, med_name)
            new_stock = updated_item.current_stock if updated_item else curr_stock + order_qty

            self._log(
                "COMPLETE",
                f"[{med_name}] Purchase Order {po.po_number} issued. Inventory updated: {med_name} new stock is {new_stock} {item['unit']} (restocked by +{order_qty}).",
                {"po_number": po.po_number, "medicine": med_name, "new_stock": new_stock}
            )

            generated_orders.append({
                "po_number": po.po_number,
                "medicine_id": po.medicine_id,
                "medicine": po.medicine,
                "vendor": po.vendor,
                "quantity": po.quantity,
                "original_price": po.original_price,
                "price": po.price,
                "total": po.total,
                "delivery_days": po.delivery_days,
                "status": po.status,
                "created_at": po.created_at.isoformat() if po.created_at else None
            })

            processed_items.append({
                "medicine_id": med_id,
                "medicine_name": med_name,
                "restock_qty": order_qty,
                "selected_vendor": selected_candidate["vendor_name"],
                "initial_price": initial_price,
                "final_price": final_price,
                "delivery_days": selected_candidate["delivery_days"],
                "total_cost": po.total,
                "comparison": comparison,
                "negotiation": negotiation_res,
                "po_number": po.po_number,
                "priority_level": priority_level,
                "priority_score": priority_score,
                "priority_circle": priority_circle,
                "explainability": item.get("explainability", {
                    "current_stock": curr_stock,
                    "reorder_threshold": threshold,
                    "daily_sales": item["daily_sales"],
                    "daily_sales_label": f"{item['daily_sales']}/day",
                    "estimated_stock_remaining": f"{days_left} days",
                    "recommended_quantity": req_qty,
                    "reason": reason,
                    "priority_level": priority_level,
                    "priority_score": priority_score,
                    "priority_circle": priority_circle
                })
            })

        self._log("COMPLETE", f"Restocking cycle successfully completed. Total orders created: {len(generated_orders)}.")

        return {
            "status": "COMPLETED",
            "logs": self.logs,
            "processed_items": processed_items,
            "orders_generated": generated_orders
        }
