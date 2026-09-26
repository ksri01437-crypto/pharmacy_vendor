from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from backend.services.inventory_service import (
    get_items_needing_restock,
    get_all_inventory,
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

    def run_restocking_cycle(self, target_medicine: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes the complete end-to-end restocking and negotiation workflow.
        Can be targeted at a specific medicine or run over all deficit inventory items.
        """
        self.logs = []
        self._log("OBSERVE", "Initiating store scan. Inspecting current pharmacy inventory levels...")

        # 1. OBSERVE: Check Inventory
        all_inventory = get_all_inventory(self.db)
        needing_restock = get_items_needing_restock(self.db)

        if target_medicine:
            needing_restock = [item for item in needing_restock if item["medicine_name"] == target_medicine]

        self._log(
            "OBSERVE",
            f"Inventory scan complete. Total items: {len(all_inventory)}. Low-stock alerts: {len(needing_restock)}.",
            {"low_stock_count": len(needing_restock)}
        )

        if not needing_restock:
            self._log("COMPLETE", "All inventory items are currently healthy above reorder thresholds. No action needed.")
            return {
                "status": "NO_ACTION_REQUIRED",
                "logs": self.logs,
                "processed_items": [],
                "orders_generated": []
            }

        processed_items = []
        generated_orders = []

        for item in needing_restock:
            med_name = item["medicine_name"]
            curr_stock = item["current_stock"]
            threshold = item["reorder_threshold"]
            req_qty = item["recommended_quantity"]

            # 2. DECIDE: Calculate Required Quantity
            self._log(
                "DECIDE",
                f"Deficit identified for {med_name} (Current: {curr_stock} {item['unit']}, Threshold: {threshold} {item['unit']}). Calculating required quantity...",
                {"current_stock": curr_stock, "threshold": threshold, "daily_sales": item["daily_sales"]}
            )
            self._log(
                "DECIDE",
                f"Calculated recommended restock: {req_qty} {item['unit']} to replenish buffer and reach target stock ({item['target_stock']} {item['unit']}).",
                {"recommended_quantity": req_qty}
            )

            # 3. ACT: Request Vendor Offers
            self._log("ACT", f"Querying vendor network for supply offers of {med_name} (Qty: {req_qty})...")
            available_vendors = get_vendors_for_medicine(self.db, med_name)

            if not available_vendors:
                self._log("OBSERVE RESULT", f"Warning: No registered vendors found supplying {med_name}. Manual escalation required.")
                continue

            vendor_names = ", ".join([v.vendor_name for v in available_vendors])
            self._log("OBSERVE RESULT", f"Found {len(available_vendors)} active vendors: {vendor_names}.")

            # 4. DECIDE: Compare Vendors & Score Offers
            self._log("DECIDE", f"Evaluating quotes against price, delivery lead time, MOQ constraints, and vendor reliability...")
            comparison = compare_vendor_offers(available_vendors, req_qty)

            selected_candidate = comparison[0] if comparison else None
            if not selected_candidate:
                self._log("OBSERVE RESULT", f"Failed to match any suitable vendor quotation for {med_name}.")
                continue

            self._log(
                "DECIDE",
                f"Best candidate selected: {selected_candidate['vendor_name']} (Base Price: ₹{selected_candidate['unit_price']:.2f}, Delivery: {selected_candidate['delivery_days']} days, MOQ: {selected_candidate['moq']}).",
                {"candidate": selected_candidate}
            )

            # 5. ACT: Negotiate with Candidate Vendor
            order_qty = selected_candidate["effective_qty"]
            initial_price = selected_candidate["unit_price"]
            min_price = selected_candidate["min_acceptable_price"]

            self._log(
                "ACT",
                f"Initiating autonomous negotiation with {selected_candidate['vendor_name']} for {order_qty} units (Starting at ₹{initial_price:.2f}/unit)..."
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
                f"Negotiation concluded with {selected_candidate['vendor_name']}. Final agreed price: ₹{final_price:.2f}/unit (Saved ₹{initial_price - final_price:.2f}/unit or {savings_pct}%).",
                {"final_price": final_price, "savings_pct": savings_pct}
            )

            # 7. DECIDE AGAIN: Final Deal Authorization
            self._log(
                "DECIDE",
                f"Deal validated. Authorizing automated Purchase Order generation for {order_qty} units at ₹{final_price:.2f}."
            )

            # 8. COMPLETE: Issue Purchase Order & Update Inventory
            po = create_purchase_order(
                db=self.db,
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
                medicine=med_name,
                vendor_name=selected_candidate["vendor_name"],
                initial_price=initial_price,
                final_price=final_price,
                transcript=negotiation_res["transcript"],
                status="Accepted"
            )

            updated_item = get_item_by_name(self.db, med_name)
            new_stock = updated_item.current_stock if updated_item else curr_stock + order_qty

            self._log(
                "COMPLETE",
                f"Purchase Order {po.po_number} issued. Inventory updated for {med_name}: new stock is {new_stock} {item['unit']}.",
                {"po_number": po.po_number, "total_value": po.total, "new_stock": new_stock}
            )

            generated_orders.append({
                "po_number": po.po_number,
                "medicine": po.medicine,
                "vendor": po.vendor,
                "quantity": po.quantity,
                "original_price": po.original_price,
                "price": po.price,
                "total": po.total,
                "delivery_days": po.delivery_days,
                "status": po.status,
                "created_at": po.created_at.isoformat()
            })

            processed_items.append({
                "medicine_name": med_name,
                "restock_qty": order_qty,
                "selected_vendor": selected_candidate["vendor_name"],
                "initial_price": initial_price,
                "final_price": final_price,
                "total_cost": po.total,
                "comparison": comparison,
                "negotiation": negotiation_res
            })

        self._log("COMPLETE", f"Restocking cycle successfully completed. Total orders created: {len(generated_orders)}.")

        return {
            "status": "COMPLETED",
            "logs": self.logs,
            "processed_items": processed_items,
            "orders_generated": generated_orders
        }
