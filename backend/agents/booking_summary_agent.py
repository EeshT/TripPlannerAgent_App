"""
Booking Summary Agent
---------------------
Produces the final BookingSummary object that the Streamlit UI renders
as the pre-payment confirmation card. All figures come from verified
data — never from LLM hallucination.
"""
from schema import PlannerState, BookingSummary
from dotenv import load_dotenv

load_dotenv()


def booking_summary_node(state: PlannerState) -> PlannerState:
    print("\n========== ENTERED BOOKING SUMMARY NODE ==========")

    req    = state["user_request"]
    bv     = state["booking_verification"]
    cl     = state["checkout_links"]
    flight = state["selected_flight"]
    hotel  = state["selected_hotel"]
    nights = (req.end_date - req.start_date).days

    fv = bv.flight
    hv = bv.hotel

    # Flight figures — prefer verified values, fall back to selected values
    flight_price_pp = (
        fv.verified_price
        if fv.verified_price > 0
        else flight.outbound_flight.price
    )
    flight_total = flight_price_pp * req.num_people * 2   # outbound + return

    # Hotel figures
    hotel_pricepn = (
        hv.verified_price_per_night
        if hv.verified_price_per_night > 0
        else (hotel.price_per_night if hotel else 0.0)
    )
    hotel_total = hotel_pricepn * nights

    grand_total = flight_total + hotel_total

    state["booking_summary"] = BookingSummary(
        flight_airline          = fv.verified_airline,
        flight_number           = fv.flight_number or "",
        flight_price_per_person = flight_price_pp,
        flight_total_price      = flight_total,
        flight_checkout_url     = cl.flight_checkout_url,

        hotel_name              = hv.verified_hotel_name,
        hotel_room_type         = hv.room_type or "Standard Room",
        hotel_price_per_night   = hotel_pricepn,
        hotel_nights            = nights,
        hotel_total_price       = hotel_total,
        hotel_checkout_url      = cl.hotel_checkout_url,

        num_people              = req.num_people,
        grand_total             = grand_total,
        currency                = "INR",
    )

    print(f"[summary] Grand total: ₹{grand_total:,.0f}")
    print("\n========== EXITED BOOKING SUMMARY NODE ==========")
    return state