"""
Timeline Repair Agent
---------------------
Runs ONLY when booking verification finds a discrepancy — e.g. the
verified departure time differs from the originally planned time, or
the verified price differs significantly.

It patches the itinerary's daily_plans to match verified booking times
and adjusts Day 1 / last-day activities accordingly, then stores the
repaired itinerary back in state.

If no repair is needed (all verification fields match), it short-circuits
and returns state unchanged.
"""
import json
from schema import PlannerState, TravelItinerary
from LLM_config import llm
from langchain_core.messages import HumanMessage


def _needs_repair(state: PlannerState) -> bool:
    """Return True if verified data differs enough to need itinerary repair."""
    bv = state.get("booking_verification")
    if bv is None:
        return False

    flight  = state["selected_flight"]
    out     = flight.outbound_flight
    fv      = bv.flight
    hv      = bv.hotel

    # Flight time changed
    if (
        fv.verified_departure_time not in ("TBD", "", out.departure_time)
        or fv.verified_arrival_time not in ("TBD", "", out.arrival_time)
    ):
        return True

    # Price changed by more than 5 %
    if out.price > 0 and fv.verified_price > 0:
        if abs(fv.verified_price - out.price) / out.price > 0.05:
            return True

    # Hotel price changed by more than 5 %
    hotel = state.get("selected_hotel")
    if hotel and hotel.price_per_night > 0 and hv.verified_price_per_night > 0:
        if abs(hv.verified_price_per_night - hotel.price_per_night) / hotel.price_per_night > 0.05:
            return True

    return False


def timeline_repair_node(state: PlannerState) -> PlannerState:
    print("\n========== ENTERED TIMELINE REPAIR NODE ==========")

    if not _needs_repair(state):
        print("[repair] No discrepancies detected — skipping repair.")
        print("\n========== EXITED TIMELINE REPAIR NODE ==========")
        return state

    bv      = state["booking_verification"]
    fv      = bv.flight
    hv      = bv.hotel
    draft   = state["itinerary"]
    req     = state["user_request"]

    changes = []
    if fv.verified_departure_time not in ("TBD", "", state["selected_flight"].outbound_flight.departure_time):
        changes.append(
            f"Outbound flight now departs at {fv.verified_departure_time} "
            f"(was {state['selected_flight'].outbound_flight.departure_time}). "
            f"Adjust Day 1 morning activities to start after arrival at {fv.verified_arrival_time}."
        )
    if fv.verified_price != state["selected_flight"].outbound_flight.price and fv.verified_price > 0:
        changes.append(
            f"Flight price updated to ₹{fv.verified_price} per leg "
            f"(was ₹{state['selected_flight'].outbound_flight.price})."
        )
    if hv.verified_price_per_night > 0:
        hotel = state.get("selected_hotel")
        if hotel and abs(hv.verified_price_per_night - hotel.price_per_night) / max(hotel.price_per_night, 1) > 0.05:
            changes.append(
                f"Hotel price updated to ₹{hv.verified_price_per_night}/night "
                f"(was ₹{hotel.price_per_night}/night)."
            )

    changes_str = "\n".join(f"- {c}" for c in changes)

    prompt = f"""
You are repairing a travel itinerary to reflect verified booking data.

=== VERIFIED CHANGES ===
{changes_str}

=== CURRENT ITINERARY (JSON) ===
{draft.model_dump_json(indent=2)}

=== REPAIR RULES ===
1. Adjust activity time_slots on Day 1 so nothing starts before the
   verified arrival time ({fv.verified_arrival_time}).
2. Adjust the last day so all activities finish before the return
   departure time if known.
3. Update total_estimated_cost to reflect verified prices.
4. Update travel_tips if relevant (e.g. "Flight departs at {fv.verified_departure_time}").
5. Do NOT change hotel, selected_flight, destination, or daily plan dates.
6. Do NOT add or remove days.
7. Return ONLY valid JSON matching the exact same schema — no markdown, no explanation.
"""
    response = llm.invoke([HumanMessage(content=prompt)])
    raw = response.content.strip()

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    if raw.endswith("```"):
        raw = raw[:raw.rfind("```")].strip()

    try:
        data    = json.loads(raw)
        repaired = TravelItinerary.model_validate(data)
        state["itinerary"] = repaired
        print(f"[repair] Itinerary repaired for {len(changes)} change(s).")
    except Exception as e:
        print(f"[repair] Parse error: {e} — keeping original itinerary.")

    print("\n========== EXITED TIMELINE REPAIR NODE ==========")
    return state