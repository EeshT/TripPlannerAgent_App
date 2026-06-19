"""
Booking Verification Agent
--------------------------
Uses Tavily web search to verify real-time availability and pricing for
the selected flight and hotel. Runs two independent searches in parallel
(sequentially here for simplicity) and stores structured results.

If verification is inconclusive (search returns no usable data), the agent
marks the item as available=True with a caveat in `notes` so the pipeline
is never blocked — the user still gets checkout links.
"""
import json
from datetime import datetime
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.messages import HumanMessage
from schema import (
    PlannerState,
    FlightVerification,
    HotelVerification,
    BookingVerification,
)
from LLM_config import llm
from dotenv import load_dotenv

load_dotenv()

_search = TavilySearchResults(max_results=6)


# ── helpers ───────────────────────────────────────────────────────────────────

def _search_context(query: str) -> str:
    """Run a Tavily query and return joined content snippets."""
    print(f"[verification] Searching: {query}")
    try:
        results = _search.invoke(query)
        if isinstance(results, list):
            return "\n".join(
                f"[{r.get('title','')}] {r.get('content','')[:400]}"
                for r in results if r.get("content")
            )
    except Exception as e:
        print(f"[verification] Search error: {e}")
    return ""


def _parse_json_from_llm(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    if text.endswith("```"):
        text = text[:text.rfind("```")].strip()
    return json.loads(text)


# ── Flight verification ───────────────────────────────────────────────────────

def _verify_flight(state: PlannerState) -> FlightVerification:
    req    = state["user_request"]
    flight = state["selected_flight"]
    out    = flight.outbound_flight

    query = (
        f"{out.airline} flights {req.source} to {req.destination} "
        f"{req.start_date} availability price booking"
    )
    context = _search_context(query)

    if not context:
        # No search data — pass through with caveat
        return FlightVerification(
            is_available          = True,
            verified_airline      = out.airline,
            verified_departure_time = out.departure_time,
            verified_arrival_time = out.arrival_time,
            verified_price        = out.price,
            booking_url           = out.booking_url or "",
            flight_number         = "",
            notes                 = "Could not verify online — please confirm on airline website.",
        )

    prompt = f"""
You are verifying flight availability for a travel booking system.

=== FLIGHT TO VERIFY ===
Airline: {out.airline}
Route: {req.source} → {req.destination}
Date: {req.start_date}
Expected departure: {out.departure_time}
Expected arrival: {out.arrival_time}
Expected price: ₹{out.price}
Current booking URL: {out.booking_url}

=== SEARCH RESULTS ===
{context}

Based on the search results, extract verified flight information.
Return ONLY a JSON object with these exact keys:
{{
  "is_available": true or false,
  "verified_airline": "airline name",
  "verified_departure_time": "HH:MM or original if not found",
  "verified_arrival_time": "HH:MM or original if not found",
  "verified_price": price as number (0 if not found),
  "booking_url": "best booking URL found or original",
  "flight_number": "flight number e.g. 6E-123, empty string if not found",
  "notes": "any discrepancies or caveats, empty string if all matches"
}}

Rules:
- If search results confirm flights exist on this route/date, set is_available=true
- If search results explicitly say no seats / sold out, set is_available=false
- If inconclusive, set is_available=true with a note
- Prefer booking URLs from official airline sites or makemytrip/goibibo/cleartrip
- Return ONLY the JSON object
"""
    response = llm.invoke([HumanMessage(content=prompt)])
    try:
        data = _parse_json_from_llm(response.content)
        return FlightVerification(**data)
    except Exception as e:
        print(f"[verification] Flight parse error: {e}")
        return FlightVerification(
            is_available          = True,
            verified_airline      = out.airline,
            verified_departure_time = out.departure_time,
            verified_arrival_time = out.arrival_time,
            verified_price        = out.price,
            booking_url           = out.booking_url or "",
            flight_number         = "",
            notes                 = "Verification parsing failed — please confirm manually.",
        )


# ── Hotel verification ────────────────────────────────────────────────────────

def _verify_hotel(state: PlannerState) -> HotelVerification:
    req   = state["user_request"]
    hotel = state["selected_hotel"]

    if hotel is None:
        return HotelVerification(
            is_available         = False,
            verified_hotel_name  = "No hotel selected",
            verified_price_per_night = 0.0,
            room_type            = "Unknown",
            booking_url          = "",
            notes                = "No hotel was selected in the planning stage.",
        )

    nights = (req.end_date - req.start_date).days
    query  = (
        f"{hotel.name} {req.destination} room availability "
        f"check-in {req.start_date} check-out {req.end_date} "
        f"{req.num_people} guests booking price"
    )
    context = _search_context(query)

    if not context:
        return HotelVerification(
            is_available         = True,
            verified_hotel_name  = hotel.name,
            verified_price_per_night = hotel.price_per_night,
            room_type            = "Standard Room",
            booking_url          = hotel.booking_url or (
                hotel.booking_platforms[0]["url"]
                if hotel.booking_platforms else ""
            ),
            notes                = "Could not verify online — please confirm on hotel website.",
        )

    # Pick best booking URL from known platforms
    best_url = hotel.booking_url
    if hotel.booking_platforms:
        for p in hotel.booking_platforms:
            url = p.get("url", "")
            for preferred in ["booking.com", "makemytrip", "goibibo", "agoda"]:
                if preferred in url.lower():
                    best_url = url
                    break

    prompt = f"""
You are verifying hotel availability for a travel booking system.

=== HOTEL TO VERIFY ===
Hotel name: {hotel.name}
Location: {hotel.location}
Check-in: {req.start_date}
Check-out: {req.end_date}
Guests: {req.num_people}
Nights: {nights}
Current price/night: ₹{hotel.price_per_night}
Booking URL: {best_url}

=== SEARCH RESULTS ===
{context}

Extract verified hotel availability information.
Return ONLY a JSON object with these exact keys:
{{
  "is_available": true or false,
  "verified_hotel_name": "exact hotel name",
  "verified_price_per_night": price per night as number (0 if not found),
  "room_type": "room type e.g. Deluxe Double, Standard Room, Sea View Suite",
  "booking_url": "best direct booking URL found",
  "notes": "any discrepancies, price changes, or caveats"
}}

Rules:
- If search confirms rooms available for the dates, set is_available=true
- If explicitly sold out or unavailable, set is_available=false
- If inconclusive, set is_available=true with a note
- Prefer booking.com, makemytrip, or hotel's official site for booking_url
- Return ONLY the JSON object
"""
    response = llm.invoke([HumanMessage(content=prompt)])
    try:
        data = _parse_json_from_llm(response.content)
        return HotelVerification(**data)
    except Exception as e:
        print(f"[verification] Hotel parse error: {e}")
        return HotelVerification(
            is_available         = True,
            verified_hotel_name  = hotel.name,
            verified_price_per_night = hotel.price_per_night,
            room_type            = "Standard Room",
            booking_url          = best_url,
            notes                = "Verification parsing failed — please confirm manually.",
        )


# ── Main node ─────────────────────────────────────────────────────────────────

def booking_verification_node(state: PlannerState) -> PlannerState:
    print("\n========== ENTERED BOOKING VERIFICATION NODE ==========")

    flight_v = _verify_flight(state)
    hotel_v  = _verify_hotel(state)

    state["booking_verification"] = BookingVerification(
        flight      = flight_v,
        hotel       = hotel_v,
        verified_at = datetime.now().isoformat(),
    )

    print(f"[verification] Flight available: {flight_v.is_available}")
    print(f"[verification] Hotel available:  {hotel_v.is_available}")
    print("\n========== EXITED BOOKING VERIFICATION NODE ==========")
    return state