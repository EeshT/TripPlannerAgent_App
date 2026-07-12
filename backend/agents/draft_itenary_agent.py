import json
from schema import (
    PlannerState, TravelItinerary, DailyPlan,
    Activity, Hotel, Flight, RoundTripFlightOption
)
from LLM_config import llm
from langchain_core.messages import HumanMessage


def _placeholder_hotel(destination: str) -> Hotel:
    """Used when no hotel was selected upstream, so TravelItinerary (which
    requires a Hotel) still validates instead of crashing this node."""
    return Hotel(
        hotel_id="tbd", name="To be arranged", rating=0.0,
        price_per_night=0.0, location=destination,
        latitude=0.0, longitude=0.0, amenities=[], booking_url="",
        booking_platforms=[], distance_to_city_center=0.0, suitability_score=0.0,
    )


def _placeholder_flight(source: str, destination: str) -> RoundTripFlightOption:
    """Used when no flight was selected upstream, so TravelItinerary (which
    requires a RoundTripFlightOption) still validates instead of crashing."""
    leg_out = Flight(
        airline="To be arranged", source=source, destination=destination,
        departure_time="TBD", arrival_time="TBD", duration="TBD",
        stops=0, price=0.0, booking_url="",
    )
    leg_ret = Flight(
        airline="To be arranged", source=destination, destination=source,
        departure_time="TBD", arrival_time="TBD", duration="TBD",
        stops=0, price=0.0, booking_url="",
    )
    return RoundTripFlightOption(
        option_id="tbd", category="unknown",
        outbound_flight=leg_out, return_flight=leg_ret,
        total_price=0.0, total_duration_minutes=0, score=0.0,
    )


def _build_prompt(state: PlannerState) -> str:
    request              = state["user_request"]
    hotel                = state["selected_hotel"]
    selected_attractions = state["selected_attractions"]
    weather              = state["weather"]
    flights              = state["selected_flight"]
    transit              = state["transit"]

    # Only the fields the LLM actually needs to schedule activities sensibly —
    # name/location for "where is home base", lat/lon in case it wants to
    # reason about distance. NOT the full Hotel object (hotel_id, ratings,
    # amenities, booking_platforms, etc.) — those are never used for
    # scheduling and the LLM is no longer asked to echo them back; we splice
    # the real Hotel object back in with Python after parsing (see below).
    if hotel:
        hotel_str = (
            f"Name: {hotel.name}\n"
            f"Location: {hotel.location}\n"
            f"Coordinates: {hotel.latitude}, {hotel.longitude}"
        )
    else:
        hotel_str = "No hotel selected yet — treat as 'To be arranged'."

    # Same idea for flights: only what affects scheduling (arrival/departure
    # times bound Day 1 / last-day activities). Full Flight/RoundTripFlightOption
    # objects are reattached in Python afterward, not asked of the LLM.
    if flights:
        flight_str = (
            f"Outbound: {flights.outbound_flight.airline} "
            f"{flights.outbound_flight.source}→{flights.outbound_flight.destination}, "
            f"arrives {flights.outbound_flight.arrival_time}\n"
            f"Return:   {flights.return_flight.airline} "
            f"{flights.return_flight.source}→{flights.return_flight.destination}, "
            f"departs {flights.return_flight.departure_time}"
        )
        if flights.category == "manual":
            flight_str += (
                "\nNote: manually entered — times are TBD; don't assume "
                "a specific arrival time for Day 1 scheduling."
            )
    else:
        flight_str = "No flight data available — treat timing as 'To be arranged'."

    # Weather summary
    weather_str = "\n".join(
        f"  {w.date}: {w.condition}, {w.temperature}°C, "
        f"rain {int(w.rain_probability*100)}%, suitability={w.suitability.value}"
        for w in weather
    ) if weather else "No weather data."

    # Attractions summary
    attr_str = "\n".join(
        f"  {a.attraction_id} | {a.name} | {a.category} | "
        f"{a.duration_hours}h | fee ₹{a.entry_fee}"
        for a in selected_attractions
    ) if selected_attractions else "No attractions selected."

    num_days  = (request.end_date - request.start_date).days + 1
    date_list = [
        str(request.start_date + __import__("datetime").timedelta(days=i))
        for i in range(num_days)
    ]

    return f"""
You are a travel itinerary planner. Return ONLY a valid JSON object — no markdown,
no explanation, no code fences. The JSON must exactly match this structure:

{{
  "daily_plans": [
    {{
      "day_number": int,
      "date": "YYYY-MM-DD",
      "weather_summary": string,
      "activities": [
        {{
          "attraction_id": string or null,
          "time_slot": "HH:MM-HH:MM",
          "title": string,
          "category": string,
          "location": string,
          "estimated_cost": number (0 if unknown),
          "notes": string
        }}
      ]
    }}
  ],
  "travel_tips": [string]
}}

Do NOT include "destination", "hotel", "selected_flight", "total_estimated_cost",
"recommended_flights", or "recommended_transit" fields — those are filled in
separately from verified data, not by you. Only return "daily_plans" and
"travel_tips".

=== TRIP DETAILS ===

Destination: {request.destination}
Travel Dates: {request.start_date} to {request.end_date} ({num_days} days)
Days: {date_list}
Travellers: {request.num_people}
Budget: ₹{request.budget}
Travel Style: {request.preferences.travel_style}
Interests: {request.preferences.interests}
Dietary Restrictions: {request.preferences.dietary_restrictions}

=== HOTEL (home base — for scheduling context only) ===
{hotel_str}

=== FLIGHT (arrival/departure bounds — for scheduling context only) ===
{flight_str}

=== WEATHER ===
{weather_str}

=== SELECTED ATTRACTIONS ===
{attr_str}

=== PLANNING RULES ===
1. One DailyPlan per travel day — dates are {date_list}
2. Schedule outdoor attractions on outdoor/light-outdoor days only
3. Schedule indoor attractions on indoor/rainy days
4. Max 3-4 activities per day; respect duration_hours
5. Set estimated_cost to 0 when unknown — do NOT guess prices
6. Use attraction_id from the attractions list above where relevant
7. Keep travel_tips practical and specific to {request.destination}
8. Day 1 activities should not start before the flight's arrival time; the
   last day's activities should finish before the return flight's departure

IMPORTANT: Return ONLY the JSON object described above. No other text whatsoever.
"""


def itinerary_planner_node(state: PlannerState) -> PlannerState:

    print("\n========== ENTERED DRAFT ITINERARY NODE ==========")

    prompt   = _build_prompt(state)
    response = llm.invoke([HumanMessage(content=prompt)])
    raw_text = response.content.strip()

    # Strip markdown fences if the model adds them despite instructions
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()
    if raw_text.endswith("```"):
        raw_text = raw_text[: raw_text.rfind("```")].strip()

    try:
        data = json.loads(raw_text)
    except Exception as e:
        print(f"[draft_itinerary] Parse error: {e}")
        print(f"[draft_itinerary] Raw response:\n{raw_text[:500]}")
        raise RuntimeError(
            f"Failed to parse itinerary from LLM response: {e}\n"
            f"Raw (first 500 chars): {raw_text[:500]}"
        ) from e

    # The LLM only returns daily_plans + travel_tips now. Everything else
    # (hotel, selected_flight, destination) comes straight from state —
    # it's already correct, already validated, and doesn't need to survive
    # a round trip through the LLM's output.
    req     = state["user_request"]
    hotel   = state["selected_hotel"] or _placeholder_hotel(req.destination)
    flights = state["selected_flight"] or _placeholder_flight(req.source, req.destination)
    nights  = max((req.end_date - req.start_date).days, 0)

    hotel_cost  = (hotel.price_per_night * nights) if hotel else 0.0
    flight_cost = (flights.total_price * req.num_people) if flights else 0.0
    activity_cost = sum(
        activity.get("estimated_cost", 0) or 0
        for day in data.get("daily_plans", [])
        for activity in day.get("activities", [])
    )

    try:
        itinerary = TravelItinerary(
            destination=req.destination,
            hotel=hotel,
            selected_flight=flights,
            total_estimated_cost=round(hotel_cost + flight_cost + activity_cost, 2),
            daily_plans=[DailyPlan.model_validate(d) for d in data.get("daily_plans", [])],
            recommended_flights=[],
            recommended_transit=[],
            travel_tips=data.get("travel_tips", []),
        )
    except Exception as e:
        print(f"[draft_itinerary] Validation error: {e}")
        print(f"[draft_itinerary] Raw response:\n{raw_text[:500]}")
        raise RuntimeError(
            f"Failed to validate itinerary structure: {e}\n"
            f"Raw (first 500 chars): {raw_text[:500]}"
        ) from e

    state["itinerary"] = itinerary

    print("\n========== EXITED DRAFT ITINERARY NODE ==========")
    return state