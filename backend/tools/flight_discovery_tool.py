from uuid import uuid4
import re
from LLM_config import llm
from langchain_community.tools.tavily_search import TavilySearchResults

from schema import (
    PlannerState,
    TravelRequest,
    Flight,
    RoundTripFlightOption,
    FlightSearchOutput,
)
from dotenv import load_dotenv

load_dotenv()


search_tool = TavilySearchResults(max_results=10)


def duration_to_minutes(duration: str) -> int:
    """
    Converts:
    '2h 30m'
    '2h'
    '45m'
    """

    duration = duration.lower()

    hours = 0
    minutes = 0

    h_match = re.search(r"(\d+)\s*h", duration)
    m_match = re.search(r"(\d+)\s*m", duration)

    if h_match:
        hours = int(h_match.group(1))

    if m_match:
        minutes = int(m_match.group(1))

    return hours * 60 + minutes


def compute_flight_score(
    option: RoundTripFlightOption,
    request: TravelRequest
):

    score = 0

    score += max(
        0,
        100 - option.total_price / 10
    )

    score += max(
        0,
        50 - option.total_duration_minutes / 60
    )

    if option.outbound_flight.stops == 0:
        score += 20

    if option.return_flight.stops == 0:
        score += 20

    return score


def create_round_trip_options(
    outbound_flights,
    return_flights,
    request: TravelRequest,
):

    options = []

    for outbound in outbound_flights[:5]:

        for inbound in return_flights[:5]:

            total_price = (
                outbound.price
                + inbound.price
            )

            total_duration = (
                duration_to_minutes(
                    outbound.duration
                )
                +
                duration_to_minutes(
                    inbound.duration
                )
            )

            option = RoundTripFlightOption(
                option_id=str(uuid4()),
                category="candidate",
                outbound_flight=Flight(
                    airline=outbound.airline,
                    source=request.source,
                    destination=request.destination,
                    departure_time=outbound.departure_time,
                    arrival_time=outbound.arrival_time,
                    duration=outbound.duration,
                    stops=outbound.stops,
                    price=outbound.price,
                    booking_url=outbound.booking_url,
                ),
                return_flight=Flight(
                    airline=inbound.airline,
                    source=request.destination,
                    destination=request.source,
                    departure_time=inbound.departure_time,
                    arrival_time=inbound.arrival_time,
                    duration=inbound.duration,
                    stops=inbound.stops,
                    price=inbound.price,
                    booking_url=inbound.booking_url,
                ),
                total_price=total_price,
                total_duration_minutes=total_duration,
                score=0,
            )

            option.score = compute_flight_score(
                option,
                request,
            )

            options.append(option)

    return options


def discover_flights(
    request: TravelRequest
):

    query = f"""
    {request.source} to {request.destination}
    flights
    departure {request.start_date}

    return

    {request.destination} to {request.source}
    departure {request.end_date}
    """

    try:
        results = search_tool.invoke(query)
    except Exception as e:
        print("Tavily error:", e)
        return []

    if not results:
        return []

    context = "\n\n".join(
        [
            result.get("content", "")
            for result in results
        ]
    )

    structured_llm = (
        llm.with_structured_output(
            FlightSearchOutput
        )
    )

    response = structured_llm.invoke(
        f"""
        Extract flight information.

        Source:
        {request.source}

        Destination:
        {request.destination}

        Departure Date:
        {request.start_date}

        Return Date:
        {request.end_date}

        Search Results:
        {context}

        Return flights only if
        airline and price are available.
        """
    )

    return create_round_trip_options(
        response.outbound_flights,
        response.return_flights,
        request,
    )


def flight_discovery_node(
    state: PlannerState
):
    
    print("\n========== ENTERED FLIGHT DISCOVERY NODE ==========")
    try:

        options = discover_flights(
            state["user_request"]
        )

        if not options:

            state["flight_search_success"] = False
            state["flight_options"] = []

            return state

        cheapest = min(
            options,
            key=lambda x: x.total_price
        )

        cheapest.category = "cheapest"

        fastest = min(
            options,
            key=lambda x: x.total_duration_minutes
        )

        fastest.category = "fastest"

        best_value = max(
            options,
            key=lambda x: x.score
        )

        best_value.category = "best_value"

        unique = {}

        for option in [
            cheapest,
            fastest,
            best_value,
        ]:
            unique[option.option_id] = option

        state["flight_options"] = (
            list(unique.values())
        )

        state["flight_search_success"] = True

    except Exception as e:

        print(
            f"Flight discovery failed: {e}"
        )

        state["flight_search_success"] = False

        state["flight_options"] = []
        
        
    print("\n========== EXITED FLIGHT DISCOVERY NODE ==========")

    return state