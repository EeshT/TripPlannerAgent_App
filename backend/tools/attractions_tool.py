import os
import requests
from typing import List
from schema import Attraction,TravelRequest,PlannerState
from dotenv import load_dotenv

load_dotenv()

OPENTRIPMAP_API_KEY = os.getenv("OPENTRIPMAP_API_KEY")
BASE_URL = ("https://api.opentripmap.com/0.1/en/places")

if not OPENTRIPMAP_API_KEY:
    raise ValueError( "OPENTRIPMAP_API_KEY not found in environment variables")

INTEREST_MAPPING = {
    "museums": "museums",
    "history": "historic",
    "nature": "natural",
    "hiking": "natural",
    "beaches": "beaches",
    "architecture": "architecture",
    "shopping": "interesting_places",
    "nightlife": "interesting_places"
}

CATEGORY_DURATION = {
    "museums": 3.0,
    "historic": 2.0,
    "architecture": 2.0,
    "natural": 4.0,
    "beaches": 5.0,
    "interesting_places": 2.0
}

def parse_rate(rate):

    if isinstance(rate, (int, float)):
        return float(rate)

    if isinstance(rate, str):

        # "3h" -> 3
        if rate.endswith("h"):
            return float(rate[:-1])

        try:
            return float(rate)

        except ValueError:
            return 0.0

    return 0.0

def get_city_coordinates(city: str) -> tuple[float, float]:

    response = requests.get(
        f"{BASE_URL}/geoname",
        params={"name": city, "apikey": OPENTRIPMAP_API_KEY},
        timeout=10
    )

    response.raise_for_status()

    data = response.json()
    
    if "lat" not in data or "lon" not in data:
        raise ValueError(f"Could not find coordinates for {city}")

    return (data["lat"],data["lon"])
    
def get_place_details(xid: str):

    response = requests.get(
        f"{BASE_URL}/xid/{xid}",
        params={"apikey": OPENTRIPMAP_API_KEY},
        timeout=10
    )

    response.raise_for_status()

    return response.json()

def score_attraction(details: dict, interest: str):

    score = 0
    rate = parse_rate(
        details.get("rate", 0)
    )

    score += float(rate) * 20


    wiki_text = (details.get("wikipedia_extracts", {}).get("text", ""))

    if wiki_text:
        score += 20

    kinds = details.get("kinds","" )

    if interest in kinds:
        score += 15

    if "interesting_places" in kinds:
        score += 10

    return score


def fetch_attractions(request: TravelRequest) -> List[Attraction]:

    lat, lon = get_city_coordinates(
        request.destination
    )

    interests = (
        request.preferences.interests
        or ["history", "museums"]
    )

    attractions = []

    seen = set()

    for interest in interests:

        kind = INTEREST_MAPPING.get(
            interest,
            "interesting_places"
        )

        response = requests.get(
            f"{BASE_URL}/radius",
            params={
                "radius": 100000,
                "lon": lon,
                "lat": lat,
                "kinds": kind,
                "rate": 3,
                "limit": 100,
                "format": "json",
                "apikey": OPENTRIPMAP_API_KEY
            },
            timeout=15
        )

        response.raise_for_status()

        places = response.json()

        # Prioritize popular attractions before making
        # expensive detail API calls
        places = sorted(
            places,
            key=lambda p: p.get("rate", 0),
            reverse=True
        )[:30]

        for place in places:

            if place.get("rate", 0) < 3:
                continue

            xid = place.get("xid")

            if not xid:
                continue

            if xid in seen:
                continue

            seen.add(xid)

            try:

                details = get_place_details(xid)

            except Exception:

                continue

            name = details.get("name")

            if not name:
                continue
            
            popularity_score = score_attraction(details, kind )

            point = details.get("point", {})

            attraction = Attraction(
                attraction_id=xid,
                name=name,
                category=kind,
                rating=parse_rate(
                    details.get(
                        "rate",
                        place.get("rate", 0)
                    )
                ),
                popularity_score=popularity_score,
                duration_hours=CATEGORY_DURATION.get(kind,2.0),
                location=request.destination,
                latitude=point.get("lat", 0.0),
                longitude=point.get("lon", 0.0),
                entry_fee=0.0
            )

            attractions.append((popularity_score, attraction))

    attractions.sort(key=lambda x: x[0], reverse=True)

    return [attraction for _, attraction in attractions[:25]]


def get_attractions(state: PlannerState):

    print("\n========== ENTERED ATTRACTION NODE ==========")
    try:
        request = state["user_request"]

        attractions = fetch_attractions(request)

        state["attractions"] = attractions

    except Exception as e:

        print(f"Attractions discovery failed: {e}")

        state["attractions"] = []
        
    
    print("\n========== EXITED ATTRACTION NODE ==========")

    return state
