from pydantic import BaseModel
from typing import List
from schema import Attraction, TravelRequest, WeatherForecast, PlannerState
from LLM_config import llm


class AttractionSelection(BaseModel):
    attraction_ids: List[str]
    reasoning: str
    
def compute_attraction_score( attraction: Attraction, request: TravelRequest, weather: List[WeatherForecast]) -> float:

    score = 0
    interests = { interest.lower() for interest in request.preferences.interests }

    category = attraction.category.lower()
    # Popularity
    score += attraction.popularity_score

    # Interest match
    if category in interests:
        score += 40

    elif any( interest in category for interest in interests ):
        score += 25

    # Budget
    if attraction.entry_fee == 0:
        score += 10

    elif attraction.entry_fee < request.budget * 0.05:
        score += 5

    # Weather compatibility
    if weather:

        indoor_days = sum(
            1
            for day in weather
            if day.suitability.value == "indoor"
        )

        outdoor_days = sum(
            1
            for day in weather
            if day.suitability.value == "outdoor"
        )

        if category in [
            "museums",
            "historic",
            "architecture"
        ]:
            score += indoor_days * 5

        elif category in [
            "natural",
            "beaches"
        ]:
            score += outdoor_days * 5

    return round(score, 2)

def attraction_ranking_node( state: PlannerState ):
    
    print("\n========== ENTERED ATTRACTION RANKING NODE ==========")

    attractions = state["attractions"]
    request = state["user_request"]
    weather = state["weather"]

    scored = []

    for attraction in attractions:
        score = compute_attraction_score(attraction, request, weather )
        scored.append((score, attraction))

    scored.sort(key=lambda x: x[0], reverse=True )

    candidate_attractions = [attraction for _, attraction in scored[:15]]

    attraction_summary = "\n".join(
        [
            f"""
            Name: {a.name}
            ID: {a.attraction_id}
            Category: {a.category}
            Rating: {a.rating}
            Duration: {a.duration_hours}
            Entry Fee: {a.entry_fee}
            """
            for a in candidate_attractions
        ]
    )

    trip_days = (request.end_date - request.start_date).days + 1
    max_attractions = max(trip_days * 4, 5)

    structured_llm = llm.with_structured_output(AttractionSelection)

    response = structured_llm.invoke(
        f"""
        Destination:
        {request.destination}

        Travel Style:
        {request.preferences.travel_style}

        Interests:
        {request.preferences.interests}

        Trip Length:
        {trip_days} days

        Weather Forecast:
        {weather}

        Available Attractions:
        {attraction_summary}

        Select the best attractions for this trip.

        Choose at most {max_attractions} attractions.

        Return attraction IDs only.
        """
    )

    selected_ids = set( response.attraction_ids )

    selected_attractions = [
        attraction
        for attraction in candidate_attractions
        if attraction.attraction_id in selected_ids ]

    state["selected_attractions"] = (selected_attractions)
    state["messages"].append(response.reasoning)
    
    print("\n========== EXITED ATTRACTION RANKING NODE ==========")

    return state