import os
from abc import ABC, abstractmethod
from typing import Dict, Any, List


class BaseNegotiator(ABC):
    """Abstract interface for vendor negotiation (rule-based or LLM)."""

    @abstractmethod
    def negotiate(
        self,
        medicine: str,
        quantity: int,
        vendor_name: str,
        initial_price: float,
        min_acceptable_price: float,
        profile_notes: str = ""
    ) -> Dict[str, Any]:
        pass


class RuleBasedNegotiator(BaseNegotiator):
    """
    Modular deterministic negotiator that models multi-turn bargaining.
    Simulates realistic price convergence without requiring an external LLM API key.
    """

    def negotiate(
        self,
        medicine: str,
        quantity: int,
        vendor_name: str,
        initial_price: float,
        min_acceptable_price: float,
        profile_notes: str = ""
    ) -> Dict[str, Any]:
        transcript: List[Dict[str, str]] = []
        margin = max(0.0, initial_price - min_acceptable_price)

        # Round 1: Store Agent initiates inquiry
        transcript.append({
            "speaker": "Store Agent",
            "message": f"Hello {vendor_name}, we need to restock {quantity} units of {medicine}. Your listed price is ₹{initial_price:.2f}/unit. Can you offer a competitive discount for this order?"
        })

        if margin <= 0.05:
            # Vendor has practically zero margin to negotiate
            transcript.append({
                "speaker": vendor_name,
                "message": f"Greetings. ₹{initial_price:.2f} is already our absolute bottom-line wholesale rate for {medicine}. We cannot discount further."
            })
            return {
                "success": True,
                "initial_price": initial_price,
                "final_price": initial_price,
                "rounds": 1,
                "transcript": transcript
            }

        # First vendor response offers ~40% of the margin
        first_concession = round(initial_price - (margin * 0.45), 2)
        transcript.append({
            "speaker": vendor_name,
            "message": f"Thank you for reaching out. In consideration of your order for {quantity} units, I can offer ₹{first_concession:.2f} per unit."
        })

        # Round 2: Store Agent counters with aggressive target near vendor min price
        agent_counter = round(min_acceptable_price + (margin * 0.15), 2)
        transcript.append({
            "speaker": "Store Agent",
            "message": f"We appreciate the offer. Given our recurring monthly pharmacy demand, can you meet us at ₹{agent_counter:.2f} per unit?"
        })

        # Final vendor response: accepts close to agent's counter or splits the difference
        final_price = round(max(min_acceptable_price, agent_counter), 2)
        transcript.append({
            "speaker": vendor_name,
            "message": f"Deal accepted at ₹{final_price:.2f} per unit. We will prepare shipment immediately upon PO confirmation."
        })

        transcript.append({
            "speaker": "Store Agent",
            "message": f"Agreed. Finalizing Purchase Order for {quantity} units at ₹{final_price:.2f}/unit."
        })

        return {
            "success": True,
            "initial_price": initial_price,
            "final_price": final_price,
            "savings_per_unit": round(initial_price - final_price, 2),
            "rounds": 2,
            "transcript": transcript
        }


class LLMNegotiationProvider(BaseNegotiator):
    """
    LLM wrapper designed for Gemini / Ollama integration.
    Gracefully falls back to RuleBasedNegotiator if LLM service or API key is not configured.
    """

    def __init__(self, fallback: BaseNegotiator = None):
        self.fallback = fallback or RuleBasedNegotiator()
        self.api_key = os.getenv("GEMINI_API_KEY", "")

    def negotiate(
        self,
        medicine: str,
        quantity: int,
        vendor_name: str,
        initial_price: float,
        min_acceptable_price: float,
        profile_notes: str = ""
    ) -> Dict[str, Any]:
        # If API key is not supplied, use clean rule-based fallback
        if not self.api_key:
            return self.fallback.negotiate(
                medicine=medicine,
                quantity=quantity,
                vendor_name=vendor_name,
                initial_price=initial_price,
                min_acceptable_price=min_acceptable_price,
                profile_notes=profile_notes
            )

        # Team members can connect google-generativeai or httpx here:
        # Prompt template is structured and ready
        prompt = f"""
You are negotiating on behalf of a pharmacy with a vendor.
Medicine: {medicine}
Quantity: {quantity}
Vendor: {vendor_name}
Initial Price: ₹{initial_price}
Target Min Price: ₹{min_acceptable_price}
Vendor Profile: {profile_notes}
Conduct a realistic 2-round negotiation.
"""
        # For now, safe fallback ensures the application runs uninterrupted
        return self.fallback.negotiate(
            medicine=medicine,
            quantity=quantity,
            vendor_name=vendor_name,
            initial_price=initial_price,
            min_acceptable_price=min_acceptable_price,
            profile_notes=profile_notes
        )


def get_negotiator() -> BaseNegotiator:
    """Factory to retrieve configured negotiation provider."""
    provider_type = os.getenv("NEGOTIATOR_PROVIDER", "rule_based").lower()
    if provider_type == "llm":
        return LLMNegotiationProvider()
    return RuleBasedNegotiator()
