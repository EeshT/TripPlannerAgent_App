from langgraph.types import interrupt
from langgraph.graph import StateGraph, START, END
from schema import (
    PlannerState, TravelRequest, TravelerPreferences,
    RoundTripFlightOption, Flight,
)
from tools.weather_tool import get_weather
from tools.attractions_tool import get_attractions
from tools.attraction_ranking_tool import attraction_ranking_node
from tools.hotel_discovery_tool import get_hotels, hotel_ranking_node
from tools.flight_discovery_tool import flight_discovery_node
from agents.draft_itenary_agent import itinerary_planner_node
from agents.itenary_refinement_agent import itinerary_refinement_node
from agents.booking_verification_agent import booking_verification_node
from agents.timeline_repair_agent import timeline_repair_node
from agents.checkout_link_generator import checkout_link_generator_node
from agents.booking_summary_agent import booking_summary_node
from dotenv import load_dotenv
import uuid
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3

load_dotenv()

MAX_REFINEMENTS = 3

conn = sqlite3.connect(
    "trip_planner.db",
    check_same_thread=False
)

checkpointer = SqliteSaver(conn)


# ── Flight selection / manual input ──────────────────────────────────────────

def flight_router(state: PlannerState):
    return "flight_selection" if state["flight_search_success"] else "manual_flight_input"


def flight_selection_node(state: PlannerState):
    print("\n========== ENTERED FLIGHT SELECTION NODE ==========")
    response = interrupt({
        "type": "flight_selection",
        "options": [
            {
                "id":        f.option_id,
                "category":  f.category,
                "price":     f.total_price,
                "airline":   f.outbound_flight.airline,
                "stops":     f.outbound_flight.stops,
                "departure": f.outbound_flight.departure_time,
                "arrival":   f.outbound_flight.arrival_time,
                "duration":  f.outbound_flight.duration,
            }
            for f in state["flight_options"]
        ],
    })
    selected = next(
        o for o in state["flight_options"]
        if o.option_id == response["selected_option"]
    )
    state["selected_flight"] = selected
    print("\n========== EXITED FLIGHT SELECTION NODE ==========")
    return state


def manual_flight_input_node(state: PlannerState):
    print("\n========== ENTERED MANUAL FLIGHT NODE ==========")
    response = interrupt({
        "type":    "manual_flight_input",
        "message": "Unable to retrieve flights automatically.",
        "fields":  ["preferred_airline", "budget", "direct_only"],
    })

    airline = response.get("preferred_airline", "").strip() or "Unknown Airline"
    budget  = float(response.get("budget", 0) or 0)
    direct  = bool(response.get("direct_only", False))
    stops   = 0 if direct else 1
    req     = state["user_request"]

    out = Flight(
        airline=airline, source=req.source, destination=req.destination,
        departure_time="TBD", arrival_time="TBD", duration="TBD",
        stops=stops, price=budget / 2 if budget > 0 else 0.0, booking_url="",
    )
    ret = Flight(
        airline=airline, source=req.destination, destination=req.source,
        departure_time="TBD", arrival_time="TBD", duration="TBD",
        stops=stops, price=budget / 2 if budget > 0 else 0.0, booking_url="",
    )
    state["selected_flight"] = RoundTripFlightOption(
        option_id=str(uuid.uuid4()), category="manual",
        outbound_flight=out, return_flight=ret,
        total_price=float(budget), total_duration_minutes=0, score=0.0,
    )
    state["messages"].append(
        f"Manual flight: airline={airline}, budget={budget}, direct={direct}"
    )
    print("\n========== EXITED MANUAL FLIGHT NODE ==========")
    return state


# ── Review / refinement ───────────────────────────────────────────────────────

def review_decision_node(state: PlannerState):
    print("\n========== ENTERED REVIEW DECISION NODE ==========")
    answer = interrupt("Does this itinerary need improvement? (yes/no)")
    state["feedback_required"] = answer.strip().lower() == "yes"
    print(f"feedback_required: {state['feedback_required']}")
    print("\n========== EXITED REVIEW DECISION NODE ==========")
    return state


def review_decision_router(state: PlannerState):
    if state["feedback_required"] and state["refinement_count"] < MAX_REFINEMENTS:
        return "collect_feedback"
    return "booking_verification"          # proceed to booking pipeline


def collect_feedback_node(state: PlannerState):
    print("\n========== ENTERED COLLECT FEEDBACK NODE ==========")
    feedback = interrupt({
        "type":      "collect_feedback",
        "itinerary": state["itinerary"],
    })
    state["user_feedback"] = feedback
    print("\n========== EXITED COLLECT FEEDBACK NODE ==========")
    return state


# ── Graph assembly ────────────────────────────────────────────────────────────

builder = StateGraph(PlannerState)

# Data pipeline nodes
builder.add_node("get_weather",             get_weather)
builder.add_node("get_attractions",         get_attractions)
builder.add_node("attraction_ranking_node", attraction_ranking_node)
builder.add_node("get_hotels",              get_hotels)
builder.add_node("hotel_ranking_node",      hotel_ranking_node)
builder.add_node("flight_discovery",        flight_discovery_node)
builder.add_node("flight_selection",        flight_selection_node)
builder.add_node("manual_flight_input",     manual_flight_input_node)
builder.add_node("draft_itinerary",         itinerary_planner_node)

# Review nodes (one interrupt each)
builder.add_node("review_decision",         review_decision_node)
builder.add_node("collect_feedback",        collect_feedback_node)
builder.add_node("refine_node",             itinerary_refinement_node)

# Booking pipeline nodes
builder.add_node("booking_verification",    booking_verification_node)
builder.add_node("timeline_repair",         timeline_repair_node)
builder.add_node("checkout_link_generator", checkout_link_generator_node)
builder.add_node("booking_summary",         booking_summary_node)

# ── Edges ─────────────────────────────────────────────────────────────────────

builder.add_edge(START,                     "get_weather")
builder.add_edge("get_weather",             "get_attractions")
builder.add_edge("get_attractions",         "attraction_ranking_node")
builder.add_edge("attraction_ranking_node", "get_hotels")
builder.add_edge("get_hotels",              "hotel_ranking_node")
builder.add_edge("hotel_ranking_node",      "flight_discovery")

builder.add_conditional_edges("flight_discovery", flight_router, {
    "flight_selection":   "flight_selection",
    "manual_flight_input": "manual_flight_input",
})

builder.add_edge("flight_selection",        "draft_itinerary")
builder.add_edge("manual_flight_input",     "draft_itinerary")
builder.add_edge("draft_itinerary",         "review_decision")

builder.add_conditional_edges("review_decision", review_decision_router, {
    "collect_feedback":   "collect_feedback",
    "booking_verification": "booking_verification",
})

builder.add_edge("collect_feedback",        "refine_node")
builder.add_edge("refine_node",             "review_decision")

# Booking pipeline — always runs sequentially after user approves itinerary
builder.add_edge("booking_verification",    "timeline_repair")
builder.add_edge("timeline_repair",         "checkout_link_generator")
builder.add_edge("checkout_link_generator", "booking_summary")
builder.add_edge("booking_summary",         END)

graph = builder.compile(checkpointer=checkpointer)

if __name__ == "__main__":
    result = graph.invoke(
        {},
        config={"configurable": {"thread_id": str(uuid.uuid4())}},
    )
    print(result.get("booking_summary"))
    print("GRAPH FINISHED")