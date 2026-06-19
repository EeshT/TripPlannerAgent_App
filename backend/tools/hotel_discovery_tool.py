import os
import requests
from typing import List
from schema import Hotel, TravelRequest, Attraction, PlannerState
from langchain_core.tools import tool
from langchain_community.tools.tavily_search import TavilySearchResults
from math import radians, atan2, sqrt, cos, sin
from langchain_core.messages import HumanMessage
from LLM_config import llm
from dotenv import load_dotenv

load_dotenv()

GEOAPIFY_API_KEY = os.getenv("GEOAPIFY_API_KEY")

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = radians(lat2 - lat1)

    dlon = radians(lon2 - lon1)

    a = (sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2)
    c = (2 * atan2(sqrt(a), sqrt(1 - a)))
    return R * c

def compute_hotel_score( hotel: Hotel, request: TravelRequest, attractions: List[Attraction]) -> float:
    score = 0

    style = (request.preferences.travel_style)

    if hotel.rating:
        score += (hotel.rating * 10)

    if attractions:
        avg_distance = (
            sum(
                haversine_distance(
                    hotel.latitude,
                    hotel.longitude,
                    attraction.latitude,
                    attraction.longitude
                )
                for attraction in attractions ) / len(attractions))

        score += max(0, 40 - avg_distance)

    if style == "luxury":
        score += (hotel.rating * 5)

    elif style == "budget":

        if ( hotel.price_per_night and hotel.price_per_night < request.budget / max((request.end_date - request.start_date).days, 1 )):
            score += 20

    elif style == "family":
        if ("family" in hotel.name.lower()):
            score += 10

    if hotel.booking_platforms:
        score += 15

    return round(score, 2)

def get_city_coordinates(city: str ) -> tuple[float, float]:

    response = requests.get(
        "https://api.geoapify.com/v1/geocode/search",
        params={
            "text": city,
            "limit": 1,
            "apiKey": GEOAPIFY_API_KEY
        },
        timeout=10
    )

    response.raise_for_status()

    data = response.json()

    features = data.get("features",[])
    if not features:
        raise ValueError(f"Could not find coordinates for '{city}'")

    coords = features[0]["geometry"]["coordinates"]

    lon = coords[0]
    lat = coords[1]

    return lat, lon


def fetch_hotels(request: TravelRequest) -> List[Hotel]:
    lat, lon = get_city_coordinates(request.destination)

    response = requests.get(
        "https://api.geoapify.com/v2/places",
        params={
            "categories":"accommodation.hotel",
            "filter":f"circle:{lon},{lat},25000",
            "bias":f"proximity:{lon},{lat}",
            "limit": 30,
            "apiKey":GEOAPIFY_API_KEY
        },
        timeout=15)

    response.raise_for_status()

    data = response.json()

    hotels = []

    for feature in data.get("features", []):

        props = feature.get("properties",{})

        name = props.get("name")

        if not name:
            continue

        hotel = Hotel(
            hotel_id=str(feature.get("properties", {}).get("place_id", "")),
            name=name,
            rating=float(props.get("rank", {}).get("importance",0 )),
            price_per_night=0.0,
            location=props.get( "formatted", request.destination),
            latitude=props.get( "lat", 0.0),
            longitude=props.get("lon" , 0.0),
            amenities=[],
            booking_url="",
            booking_platforms=[],
            distance_to_city_center=0.0,
            suitability_score=0.0)
        hotels.append(hotel)
    return hotels[:10]

def get_hotels(state: PlannerState):
    
    print("\n========== ENTERED HOTELS NODE ==========")

    try:

        request = state["user_request"]

        hotels = fetch_hotels(request)

        state["hotels"] = hotels

    except Exception as e:

        print(f"Hotel discovery failed: {e}")

        state["hotels"] = []
        
    
    print("\n========== EXITED HOTELS NODE ==========")

    return state
    
def enrich_hotel_booking_links(
    hotels: List[Hotel],
    request: TravelRequest,
    hotels_to_enrich: int = 1
) -> List[Hotel]:

    if not hotels:
        return hotels

    search_tool = TavilySearchResults(max_results=5)

    booking_domains = {
        "booking.com": "Booking.com",
        "makemytrip.com": "MakeMyTrip",
        "agoda.com": "Agoda",
        "goibibo.com": "Goibibo",
        "tripadvisor.com": "Tripadvisor",
        "cleartrip.com": "Cleartrip",
        "expedia.com": "Expedia",
        "hotels.com": "Hotels.com",
        "trip.com": "Trip.com"
    }

    # Only enrich first N hotels
    for hotel in hotels[:hotels_to_enrich]:

        print(f"Searching booking links for {hotel.name}")

        queries = [
            f'"{hotel.name}" {request.destination} booking',
            f'"{hotel.name}" {request.destination} booking.com',
            f'"{hotel.name}" {request.destination} makemytrip',
            f'"{hotel.name}" {request.destination} agoda',
            f'"{hotel.name}" {request.destination} official website',
            f'"{hotel.name}" {request.destination} {request.start_date}'
        ]

        platforms = []
        seen_urls = set()

        for query in queries:

            try:
                results = search_tool.invoke(query)

                if isinstance(results, dict):
                    results = results.get("results", [])              

            except Exception as e:
                print("\n========== TAVILY ERROR ==========")
                print("Query:", query)
                print("Error:", repr(e))
                print("==================================\n")
                continue

            for result in results:

                url = result.get("url", "")

                if not url:
                    continue

                if url in seen_urls:
                    continue

                seen_urls.add(url)

                matched = False

                for domain, platform in booking_domains.items():

                    if domain in url.lower():

                        platforms.append({
                            "platform": platform,
                            "url": url
                        })

                        matched = True
                        break

                if matched:
                    continue

                title = result.get("title", "")
                content = result.get("content", "")

                combined_text = (
                    title + " " + content
                ).lower()

                hotel_words = set(
                    hotel.name.lower().split()
                )

                text_words = set(
                    combined_text.split()
                )

                overlap = (
                    len(hotel_words & text_words)
                    / max(len(hotel_words), 1)
                )

                if overlap >= 0.7:

                    platforms.append({
                        "platform": "Official Website",
                        "url": url
                    })

        # Deduplicate once after all searches
        deduped = []
        used = set()

        for item in platforms:

            if item["url"] in used:
                continue

            used.add(item["url"])
            deduped.append(item)

        hotel.booking_platforms = deduped

        if deduped:
            hotel.booking_url = deduped[0]["url"]

        print(f"Finished {hotel.name}")
    return hotels


def hotel_ranking_node(state: PlannerState):
    
    print("\n========== ENTERED HOTEL RANKING NODE ==========")
    
    state["hotels"] = enrich_hotel_booking_links(state["hotels"], state["user_request"], hotels_to_enrich=1)
    hotels = state["hotels"]
    request = (state["user_request"])
    attractions = (state["attractions"])

    for hotel in hotels:
        hotel.suitability_score = (compute_hotel_score( hotel, request, attractions))

    hotels.sort( key=lambda h: h.suitability_score, reverse=True)

    top_hotels = hotels[:5]

    hotel_summary = "\n".join(
        [    f""" 
            Name: {hotel.name}
            Rating: {hotel.rating}
            Score: {hotel.suitability_score}
            Links: {len(hotel.booking_platforms)}
            """ for hotel in top_hotels])

    prompt = f"""
        User travel style: {request.preferences.travel_style}
        Destination: {request.destination}
        Hotels: {hotel_summary}
        Choose the best hotel.
        Explain why.
        """
    response = llm.invoke([HumanMessage(content=prompt)])
    state["messages"].append(response)
    state["hotels"] = top_hotels
    # Pick the highest-scoring hotel as the selected hotel
    state["selected_hotel"] = top_hotels[0] if top_hotels else None

    print("========== EXITING HOTEL RANKING NODE ==========\n")
    return state