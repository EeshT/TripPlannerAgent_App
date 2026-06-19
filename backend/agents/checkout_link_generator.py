"""
Checkout Link Generator
-----------------------
Builds deep-link checkout URLs for both flight and hotel using the
verified booking data. These URLs drop the user directly onto the
payment/review page of the booking platform so the only step left
is payment confirmation.

URL construction strategy (no paid API needed):
- Flight: MakeMyTrip / Cleartrip deep-link format with route + date params
- Hotel:  Booking.com / MakeMyTrip search URL with hotel name + dates

The verified booking_url from the search step is always preferred if
it already points to a specific listing. The generated URLs are fallbacks.
"""
from datetime import datetime
from urllib.parse import urlencode, quote_plus
from schema import PlannerState, CheckoutLinks
from dotenv import load_dotenv

load_dotenv()


def _flight_checkout_url(state: PlannerState) -> tuple[str, str]:
    """
    Returns (checkout_url, label) for the flight.
    Prefers the verified booking_url; falls back to a MakeMyTrip deep link.
    """
    bv     = state["booking_verification"]
    fv     = bv.flight
    req    = state["user_request"]
    flight = state["selected_flight"]
    out    = flight.outbound_flight
    ret    = flight.return_flight

    # Format dates for URL params  YYYYMMDD
    dep_str = req.start_date.strftime("%Y%m%d")
    ret_str = req.end_date.strftime("%Y%m%d")

    # Use verified URL if it's a real booking page (not empty / TBD)
    if fv.booking_url and fv.booking_url.startswith("http") and len(fv.booking_url) > 20:
        url = fv.booking_url
    else:
        # MakeMyTrip round-trip search deep link
        params = {
            "itinerary": f"{req.source.upper()}-{req.destination.upper()}-{dep_str}-E-0-0__{req.destination.upper()}-{req.source.upper()}-{ret_str}-E-0-0",
            "tripType":  "R",
            "paxType":   f"A-{req.num_people}_C-0_I-0",
            "cabinClass": "E",
            "ccde":      "IN",
            "lang":      "eng",
        }
        url = "https://www.makemytrip.com/flight/search?" + urlencode(params)

    price     = fv.verified_price if fv.verified_price > 0 else out.price
    fn        = f" {fv.flight_number}" if fv.flight_number else ""
    label     = (
        f"{fv.verified_airline}{fn} | "
        f"{req.source} → {req.destination} | "
        f"₹{price:,.0f}/person"
    )
    return url, label


def _hotel_checkout_url(state: PlannerState) -> tuple[str, str]:
    """
    Returns (checkout_url, label) for the hotel.
    Prefers the verified booking_url; falls back to a Booking.com search link.
    """
    bv    = state["booking_verification"]
    hv    = bv.hotel
    req   = state["user_request"]
    hotel = state["selected_hotel"]
    nights = (req.end_date - req.start_date).days

    # Use verified URL if it's a real page
    if hv.booking_url and hv.booking_url.startswith("http") and len(hv.booking_url) > 20:
        url = hv.booking_url
    else:
        # Booking.com search deep link
        params = {
            "ss":         hv.verified_hotel_name or (hotel.name if hotel else req.destination),
            "checkin":    req.start_date.isoformat(),
            "checkout":   req.end_date.isoformat(),
            "group_adults": req.num_people,
            "no_rooms":   1,
            "selected_currency": "INR",
        }
        url = "https://www.booking.com/search.html?" + urlencode(params)

    pricepn   = hv.verified_price_per_night if hv.verified_price_per_night > 0 else (hotel.price_per_night if hotel else 0)
    total_h   = pricepn * nights
    room      = hv.room_type or "Standard Room"
    label     = (
        f"{hv.verified_hotel_name} | "
        f"{room} | "
        f"{nights} nights | "
        f"₹{pricepn:,.0f}/night (₹{total_h:,.0f} total)"
    )
    return url, label


def checkout_link_generator_node(state: PlannerState) -> PlannerState:
    print("\n========== ENTERED CHECKOUT LINK GENERATOR NODE ==========")

    flight_url, flight_label = _flight_checkout_url(state)
    hotel_url,  hotel_label  = _hotel_checkout_url(state)

    state["checkout_links"] = CheckoutLinks(
        flight_checkout_url = flight_url,
        hotel_checkout_url  = hotel_url,
        flight_label        = flight_label,
        hotel_label         = hotel_label,
    )

    print(f"[checkout] Flight URL: {flight_url[:80]}…")
    print(f"[checkout] Hotel URL:  {hotel_url[:80]}…")
    print("\n========== EXITED CHECKOUT LINK GENERATOR NODE ==========")
    return state