from pydantic import BaseModel, Field
from typing import List, Optional, TypedDict, Annotated
from datetime import date
import operator
from enum import Enum
    
class TravelerPreferences(BaseModel):
    travel_style: Optional[str] = Field(default="balanced")
    dietary_restrictions: List[str] = []
    accessibility_needs: List[str] = []
    interests: List[str] = Field(default_factory=list)
    flexibility_tolerance: str = Field(default="medium")


class TravelRequest(BaseModel):
    source: str
    destination: str
    start_date: date
    end_date: date
    num_people: int
    budget: float
    nearby_towns: List[str]
    preferences: TravelerPreferences


class Hotel(BaseModel):
    hotel_id: str
    name: str
    rating: float
    price_per_night: float
    location: str
    latitude: float
    longitude: float
    amenities: List[str]
    booking_url: str
    booking_platforms: List[dict] = Field(default_factory=list)
    distance_to_city_center: float
    suitability_score: float


class Flight(BaseModel):
    airline: str
    source: str
    destination: str
    departure_time: str
    arrival_time: str
    duration: str
    stops: int
    price: float
    booking_url: str


class RoundTripFlightOption(BaseModel):
    option_id: str
    category: str
    outbound_flight: Flight
    return_flight: Flight
    total_price: float
    total_duration_minutes: int
    score: float


class Attraction(BaseModel):
    attraction_id: str
    name: str
    category: str
    rating: float
    popularity_score: float
    duration_hours: float
    location: str
    latitude: float
    longitude: float
    entry_fee: float


class Suitability(str, Enum):
    INDOOR = "indoor"
    LIGHT_OUTDOOR = "light_outdoor"
    OUTDOOR = "outdoor"


class WeatherForecast(BaseModel):
    date: str
    condition: str
    temperature: float
    min_temp: float
    max_temp: float
    rain_probability: float
    humidity: int
    wind_speed: float
    suitability: Suitability


class Activity(BaseModel):
    attraction_id: str | None
    time_slot: str
    title: str
    category: str
    location: str
    estimated_cost: float
    notes: str


class DailyPlan(BaseModel):
    day_number: int
    date: str
    weather_summary: str
    activities: List[Activity]
    


class TravelItinerary(BaseModel):
    destination: str
    hotel: Hotel
    selected_flight: RoundTripFlightOption
    total_estimated_cost: float
    daily_plans: List[DailyPlan]
    recommended_flights: List[dict]
    recommended_transit: List[dict]
    travel_tips: List[str]


# ── Booking Verification ───────────────────────────────────────────────────────

class FlightVerification(BaseModel):
    """Result of verifying a selected flight's availability."""
    is_available: bool
    verified_airline: str
    verified_departure_time: str
    verified_arrival_time: str
    verified_price: float
    booking_url: str
    flight_number: str          # e.g. "6E-123" — empty string if unknown
    notes: str                  # any discrepancy or caveat found


class HotelVerification(BaseModel):
    """Result of verifying hotel room availability."""
    is_available: bool
    verified_hotel_name: str
    verified_price_per_night: float
    room_type: str              # e.g. "Deluxe Sea View", "Standard Double"
    booking_url: str
    notes: str


class BookingVerification(BaseModel):
    """Aggregated verification result for both flight and hotel."""
    flight: FlightVerification
    hotel: HotelVerification
    verified_at: str            # ISO timestamp string


# ── Checkout & Summary ────────────────────────────────────────────────────────

class CheckoutLinks(BaseModel):
    flight_checkout_url: str
    hotel_checkout_url: str
    flight_label: str           # e.g. "IndiGo 6E-123 | Delhi → Goa | ₹6,100"
    hotel_label: str            # e.g. "Sea View Resort | 5 nights | ₹17,500"


class BookingSummary(BaseModel):
    """Final pre-payment summary shown to the user."""
    flight_airline: str
    flight_number: str
    flight_price_per_person: float
    flight_total_price: float
    flight_checkout_url: str

    hotel_name: str
    hotel_room_type: str
    hotel_price_per_night: float
    hotel_nights: int
    hotel_total_price: float
    hotel_checkout_url: str

    num_people: int
    grand_total: float
    currency: str = "INR"


# ── Schema helpers ─────────────────────────────────────────────────────────────

class FlightSearchResult(BaseModel):
    flights: List[RoundTripFlightOption]


class ExtractedFlight(BaseModel):
    airline: str
    departure_time: str
    arrival_time: str
    duration: str
    price: float
    stops: int
    booking_url: str


class FlightSearchOutput(BaseModel):
    outbound_flights: List[ExtractedFlight]
    return_flights: List[ExtractedFlight]


# ── State ──────────────────────────────────────────────────────────────────────

class PlannerState(TypedDict):
    user_request: TravelRequest

    hotels: List[Hotel]
    selected_hotel: Hotel | None

    attractions: List[Attraction]
    selected_attractions: List[Attraction]

    weather: List[WeatherForecast]

    flight_options: List[RoundTripFlightOption]
    selected_flight: RoundTripFlightOption | None
    flight_search_success: bool

    transit: list
    itinerary: TravelItinerary | None

    # Review / refinement
    user_feedback: str | None
    feedback_required: bool
    refinement_count: int

    # Booking pipeline
    booking_verification: BookingVerification | None
    checkout_links: CheckoutLinks | None
    booking_summary: BookingSummary | None

    messages: Annotated[list, operator.add]