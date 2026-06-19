import json
from schema import (
    PlannerState, TravelItinerary, DailyPlan,
    Activity, Hotel, RoundTripFlightOption
)
from LLM_config import llm
from langchain_core.messages import HumanMessage


def _build_prompt(state: PlannerState) -> str:
    request              = state["user_request"]
    hotel                = state["selected_hotel"]
    selected_attractions = state["selected_attractions"]
    weather              = state["weather"]
    flights              = state["selected_flight"]
    transit              = state["transit"]

    # Serialize hotel safely
    if hotel:
        hotel_str = (
            f"Name: {hotel.name}\n"
            f"Location: {hotel.location}\n"
            f"Rating: {hotel.rating}\n"
            f"Price/night: {hotel.price_per_night}\n"
            f"Amenities: {hotel.amenities}\n"
            f"Booking URL: {hotel.booking_url}"
        )
        hotel_json_hint = (
            f'{{"hotel_id":"{hotel.hotel_id}",'
            f'"name":"{hotel.name}",'
            f'"rating":{hotel.rating},'
            f'"price_per_night":{hotel.price_per_night},'
            f'"location":"{hotel.location}",'
            f'"latitude":{hotel.latitude},'
            f'"longitude":{hotel.longitude},'
            f'"amenities":{json.dumps(hotel.amenities)},'
            f'"booking_url":"{hotel.booking_url}",'
            f'"booking_platforms":{json.dumps(hotel.booking_platforms)},'
            f'"distance_to_city_center":{hotel.distance_to_city_center},'
            f'"suitability_score":{hotel.suitability_score}}}'
        )
    else:
        hotel_str       = "No hotel selected yet."
        hotel_json_hint = (
            '{"hotel_id":"tbd","name":"To be arranged",'
            '"rating":0,"price_per_night":0,'
            f'"location":"{request.destination}",'
            '"latitude":0,"longitude":0,'
            '"amenities":[],"booking_url":"",'
            '"booking_platforms":[],'
            '"distance_to_city_center":0,"suitability_score":0}'
        )

    # Serialize flight safely
    if flights:
        flight_str = (
            f"Outbound: {flights.outbound_flight.airline} "
            f"{flights.outbound_flight.source}→{flights.outbound_flight.destination} "
            f"@ ₹{flights.outbound_flight.price}\n"
            f"Return:   {flights.return_flight.airline} "
            f"{flights.return_flight.source}→{flights.return_flight.destination} "
            f"@ ₹{flights.return_flight.price}\n"
            f"Total: ₹{flights.total_price}"
        )
        # For manual entries, note that times are TBD
        if flights.category == "manual":
            flight_str += (
                "\nNote: This is a manually entered preference — "
                "times are TBD. Use the airline and price; mark "
                "departure/arrival as 'To be confirmed'."
            )
        flight_json = flights.model_dump_json()
    else:
        # Build a minimal valid placeholder so the LLM never outputs null
        flight_str  = (
            "No flight data available. "
            "Use placeholder values and note 'To be arranged' in travel tips."
        )
        flight_json = (
            '{"option_id":"tbd","category":"unknown",'
            f'"outbound_flight":{{"airline":"To be arranged",'
            f'"source":"{request.source}","destination":"{request.destination}",'
            '"departure_time":"TBD","arrival_time":"TBD","duration":"TBD",'
            '"stops":0,"price":0.0,"booking_url":""}},'
            f'"return_flight":{{"airline":"To be arranged",'
            f'"source":"{request.destination}","destination":"{request.source}",'
            '"departure_time":"TBD","arrival_time":"TBD","duration":"TBD",'
            '"stops":0,"price":0.0,"booking_url":""}},'
            '"total_price":0.0,"total_duration_minutes":0,"score":0.0}'
        )

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
  "destination": string,
  "hotel": {{hotel object — use the exact values provided below}},
  "selected_flight": {{flight object — use the exact values provided below}},
  "total_estimated_cost": number,
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
  "recommended_flights": [],
  "recommended_transit": [],
  "travel_tips": [string]
}}

=== TRIP DETAILS ===

Destination: {request.destination}
Travel Dates: {request.start_date} to {request.end_date} ({num_days} days)
Days: {date_list}
Travellers: {request.num_people}
Budget: ₹{request.budget}
Travel Style: {request.preferences.travel_style}
Interests: {request.preferences.interests}
Dietary Restrictions: {request.preferences.dietary_restrictions}

=== HOTEL (use these exact values in the hotel field) ===
{hotel_str}
Hotel JSON: {hotel_json_hint}

=== FLIGHT (use this exact object in selected_flight field) ===
{flight_str}
Flight JSON: {flight_json}

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
8. total_estimated_cost should sum hotel + flight + realistic activity costs

IMPORTANT: Return ONLY the JSON object. No other text whatsoever.
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
        data      = json.loads(raw_text)
        itinerary = TravelItinerary.model_validate(data)
    except Exception as e:
        print(f"[draft_itinerary] Parse/validate error: {e}")
        print(f"[draft_itinerary] Raw response:\n{raw_text[:500]}")
        raise RuntimeError(
            f"Failed to parse itinerary from LLM response: {e}\n"
            f"Raw (first 500 chars): {raw_text[:500]}"
        ) from e

    state["itinerary"] = itinerary

    print("\n========== EXITED DRAFT ITINERARY NODE ==========")
    return state