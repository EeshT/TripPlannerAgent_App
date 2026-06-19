import streamlit as st
import uuid
from langgraph.types import Command
from graph import graph, MAX_REFINEMENTS
from graph import TravelRequest, TravelerPreferences
from datetime import date

# ── Session state ──────────────────────────────────────────────────────────────
for key, default in [
    ("thread_id",     None),
    ("graph_started", False),
    ("result",        None),
]:
    if key not in st.session_state:
        st.session_state[key] = default

if st.session_state.thread_id is None:
    st.session_state.thread_id = str(uuid.uuid4())

# ── Pipeline definition ────────────────────────────────────────────────────────
PIPELINE_NODES = [
    ("get_weather",             "🌤️  Weather"),
    ("get_attractions",         "🗺️  Attractions"),
    ("attraction_ranking_node", "⭐  Ranking Attractions"),
    ("get_hotels",              "🏨  Hotels"),
    ("hotel_ranking_node",      "⭐  Ranking Hotels"),
    ("flight_discovery",        "✈️  Finding Flights"),
    ("flight_selection",        "🎫  Flight Selection"),
    ("manual_flight_input",     "✍️  Manual Flight"),
    ("draft_itinerary",         "📝  Drafting Itinerary"),
    ("review_decision",         "🔍  Review Decision"),
    ("collect_feedback",        "💬  Collecting Feedback"),
    ("refine_node",             "✏️  Refining Itinerary"),
    ("booking_verification",    "🔎  Verifying Availability"),
    ("timeline_repair",         "🔧  Repairing Timeline"),
    ("checkout_link_generator", "🔗  Generating Checkout Links"),
    ("booking_summary",         "📋  Booking Summary"),
]

def node_label(node_id: str) -> str:
    return next((l for n, l in PIPELINE_NODES if n == node_id), node_id)


# ── Render helpers ─────────────────────────────────────────────────────────────

def render_flight_card(opt: dict) -> None:
    stops = "Non-stop" if opt["stops"] == 0 else f"{opt['stops']} stop(s)"
    price = f"₹{opt['price']:,.0f}" if opt.get("price", 0) > 0 else "Price N/A"
    st.markdown(f"""
    <div style="border:2px solid #ddd;border-radius:10px;padding:14px 18px;
                margin-bottom:10px;background:#f9f9f9;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span style="font-size:1.1em;font-weight:700;">
            {opt['category'].upper().replace('_',' ')}
          </span>
          &nbsp;&nbsp;<span style="color:#555;">{opt['airline']}</span>
        </div>
        <div style="font-size:1.2em;font-weight:700;color:#1f77b4;">{price}</div>
      </div>
      <div style="margin-top:6px;color:#444;font-size:0.9em;">
        🛫 {opt.get('departure','—')} → 🛬 {opt.get('arrival','—')}
        &nbsp;|&nbsp; ⏱ {opt.get('duration','—')} &nbsp;|&nbsp; {stops}
      </div>
    </div>""", unsafe_allow_html=True)


def render_itinerary(itinerary) -> None:
    st.markdown(f"## 🌴 Trip to **{itinerary.destination}**")

    # Hotel
    st.markdown("### 🏨 Hotel")
    hotel = itinerary.hotel
    c1, c2 = st.columns([3, 1])
    with c1:
        st.markdown(f"**{hotel.name}**")
        st.caption(hotel.location)
        if hotel.rating > 0:
            st.write(f"⭐ Rating: {hotel.rating:.2f}")
        if hotel.price_per_night > 0:
            st.write(f"💰 ₹{hotel.price_per_night:,.0f}/night")
        if hotel.amenities:
            st.write("🛎️ " + ", ".join(hotel.amenities))
    with c2:
        if hotel.booking_platforms:
            st.markdown("**Book on:**")
            for p in hotel.booking_platforms[:4]:
                st.markdown(f"[{p['platform']}]({p['url']})", unsafe_allow_html=True)
        elif hotel.booking_url:
            st.markdown(f"[Book Here]({hotel.booking_url})")
    st.divider()

    # Flight
    st.markdown("### ✈️ Selected Flight")
    flight = itinerary.selected_flight
    out, ret = flight.outbound_flight, flight.return_flight
    co, cr = st.columns(2)
    with co:
        st.markdown("**Outbound**")
        st.write(f"✈️ {out.airline}")
        st.write(f"🛫 {out.source} → {out.destination}")
        st.write(f"🕐 {out.departure_time} → {out.arrival_time}")
        st.write(f"⏱ {out.duration}")
        st.write("🔁 " + ("Non-stop" if out.stops == 0 else f"{out.stops} stop(s)"))
        if out.price > 0:
            st.write(f"💰 ₹{out.price:,.0f}")
        if out.booking_url:
            st.markdown(f"[Book]({out.booking_url})")
    with cr:
        st.markdown("**Return**")
        st.write(f"✈️ {ret.airline}")
        st.write(f"🛫 {ret.source} → {ret.destination}")
        st.write(f"🕐 {ret.departure_time} → {ret.arrival_time}")
        st.write(f"⏱ {ret.duration}")
        st.write("🔁 " + ("Non-stop" if ret.stops == 0 else f"{ret.stops} stop(s)"))
        if ret.price > 0:
            st.write(f"💰 ₹{ret.price:,.0f}")
        if ret.booking_url:
            st.markdown(f"[Book]({ret.booking_url})")
    if flight.total_price > 0:
        st.info(f"**Total Round-Trip: ₹{flight.total_price:,.0f}**")
    st.divider()

    # Daily plans
    st.markdown("### 📅 Day-by-Day Itinerary")
    for day in itinerary.daily_plans:
        with st.expander(
            f"Day {day.day_number} — {day.date}  |  {day.weather_summary}",
            expanded=True,
        ):
            for act in day.activities:
                tc, dc = st.columns([1, 4])
                with tc:
                    st.markdown(
                        f"<div style='background:#e8f4fd;border-radius:6px;"
                        f"padding:6px 10px;text-align:center;font-weight:600;"
                        f"color:#1f77b4;'>{act.time_slot}</div>",
                        unsafe_allow_html=True,
                    )
                with dc:
                    st.markdown(f"**{act.title}**")
                    st.caption(f"📍 {act.location}")
                    if act.estimated_cost > 0:
                        st.caption(f"💰 ₹{act.estimated_cost:,.0f}")
                    if act.notes:
                        st.caption(f"📝 {act.notes}")
                st.write("")
    st.divider()

    if itinerary.travel_tips:
        st.markdown("### 💡 Travel Tips")
        for tip in itinerary.travel_tips:
            st.markdown(f"- {tip}")

    if itinerary.total_estimated_cost > 0:
        st.success(f"💼 **Total Estimated Cost: ₹{itinerary.total_estimated_cost:,.0f}**")


def render_booking_summary(state_values: dict) -> None:
    """Render the final pre-payment booking summary card."""
    bs  = state_values.get("booking_summary")
    cl  = state_values.get("checkout_links")
    bv  = state_values.get("booking_verification")

    if bs is None:
        st.warning("Booking summary not available.")
        return

    st.markdown("---")
    st.markdown("## 🎟️ Booking Summary")
    st.caption("Everything is verified and ready. Click the checkout links below to complete payment.")

    # Verification status banners
    if bv:
        fv, hv = bv.flight, bv.hotel
        cols = st.columns(2)
        with cols[0]:
            if fv.is_available:
                st.success("✅ Flight availability confirmed")
            else:
                st.error("❌ Flight may not be available — check manually")
            if fv.notes:
                st.caption(f"ℹ️ {fv.notes}")
        with cols[1]:
            if hv.is_available:
                st.success("✅ Hotel availability confirmed")
            else:
                st.error("❌ Hotel may not be available — check manually")
            if hv.notes:
                st.caption(f"ℹ️ {hv.notes}")

    st.markdown("---")

    # Summary card
    col_flight, col_hotel, col_total = st.columns([2, 2, 1])

    with col_flight:
        st.markdown("### ✈️ Flight")
        fn = f" {bs.flight_number}" if bs.flight_number else ""
        st.markdown(f"**{bs.flight_airline}{fn}**")
        if bs.flight_price_per_person > 0:
            st.write(f"₹{bs.flight_price_per_person:,.0f} × {bs.num_people} pax × 2 legs")
            st.markdown(f"### ₹{bs.flight_total_price:,.0f}")
        else:
            st.write("Price to be confirmed")
        st.markdown(
            f'<a href="{bs.flight_checkout_url}" target="_blank">'
            f'<button style="background:#1f77b4;color:white;border:none;'
            f'padding:10px 20px;border-radius:6px;font-size:1em;cursor:pointer;'
            f'margin-top:8px;">✓ Book Flight →</button></a>',
            unsafe_allow_html=True,
        )

    with col_hotel:
        st.markdown("### 🏨 Hotel")
        st.markdown(f"**{bs.hotel_name}**")
        st.caption(bs.hotel_room_type)
        if bs.hotel_price_per_night > 0:
            st.write(f"₹{bs.hotel_price_per_night:,.0f}/night × {bs.hotel_nights} nights")
            st.markdown(f"### ₹{bs.hotel_total_price:,.0f}")
        else:
            st.write("Price to be confirmed")
        st.markdown(
            f'<a href="{bs.hotel_checkout_url}" target="_blank">'
            f'<button style="background:#2ca02c;color:white;border:none;'
            f'padding:10px 20px;border-radius:6px;font-size:1em;cursor:pointer;'
            f'margin-top:8px;">✓ Book Hotel →</button></a>',
            unsafe_allow_html=True,
        )

    with col_total:
        st.markdown("### 💰 Total")
        st.markdown(
            f"<div style='font-size:2em;font-weight:800;color:#d62728;"
            f"margin-top:16px;'>₹{bs.grand_total:,.0f}</div>",
            unsafe_allow_html=True,
        )
        st.caption(f"{bs.num_people} traveller(s)")

    st.markdown("---")
    st.info(
        "💡 **Next step:** Click **Book Flight →** and **Book Hotel →** above. "
        "Each link takes you directly to the payment page. "
        "Complete payment on the booking site and you're all set!"
    )

    # Also show the full itinerary below the summary
    itin = state_values.get("itinerary")
    if itin:
        with st.expander("📄 View Full Itinerary", expanded=False):
            render_itinerary(itin)


# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(page_title="AI Trip Planner", layout="wide")
st.title("✈️ AI Trip Planner")

# ── Input form ─────────────────────────────────────────────────────────────────
with st.form("trip_form"):
    c1, c2 = st.columns(2)
    with c1:
        source      = st.text_input("Source", value="Delhi")
        destination = st.text_input("Destination", value="Goa")
        budget      = st.number_input("Budget (₹)", value=50000)
        num_people  = st.number_input("Travellers", min_value=1, value=2)
    with c2:
        start_date            = st.date_input("Start Date", value=date(2026, 12, 15))
        end_date              = st.date_input("End Date",   value=date(2026, 12, 20))
        travel_style          = st.selectbox(
            "Travel Style",
            ["budget", "balanced", "luxury", "family", "adventure", "romantic"],
        )
        flexibility_tolerance = st.selectbox("Flexibility", ["low", "medium", "high"])

    interests = st.multiselect(
        "Interests",
        ["beaches", "nightlife", "shopping", "museums",
         "hiking", "historical sites", "local food"],
    )
    dietary_restrictions = st.multiselect(
        "Dietary Restrictions", ["vegetarian", "vegan", "jain"]
    )
    accessibility_needs = st.multiselect(
        "Accessibility Needs",
        ["Not Applicable", "wheelchair", "visual_assistance", "hearing_assistance"],
    )

    submitted = st.form_submit_button(
        "🚀 Plan My Trip", disabled=st.session_state.graph_started
    )

if submitted and not st.session_state.graph_started:
    st.session_state.thread_id = str(uuid.uuid4())
    initial_state = {
        "user_request": TravelRequest(
            source=source, destination=destination,
            start_date=start_date, end_date=end_date,
            num_people=int(num_people), budget=float(budget),
            nearby_towns=[],
            preferences=TravelerPreferences(
                travel_style=travel_style,
                dietary_restrictions=dietary_restrictions,
                accessibility_needs=accessibility_needs,
                interests=interests,
                flexibility_tolerance=flexibility_tolerance,
            ),
        ),
        "hotels": [], "selected_hotel": None,
        "attractions": [], "selected_attractions": [],
        "weather": [],
        "flight_options": [], "selected_flight": None,
        "flight_search_success": False,
        "transit": [], "itinerary": None,
        "user_feedback": None, "feedback_required": False,
        "refinement_count": 0,
        "booking_verification": None,
        "checkout_links": None,
        "booking_summary": None,
        "messages": [],
    }
    with st.spinner("🤖 Agent is working — this may take a few minutes…"):
        graph.invoke(
            initial_state,
            config={"configurable": {"thread_id": st.session_state.thread_id}},
        )
    st.session_state.graph_started = True
    st.rerun()

# ── Live state ─────────────────────────────────────────────────────────────────
state = None
if st.session_state.graph_started:
    state = graph.get_state(
        config={"configurable": {"thread_id": st.session_state.thread_id}}
    )

# ── Sidebar: pipeline progress ─────────────────────────────────────────────────
if state:
    with st.sidebar:
        st.markdown("## 🔄 Pipeline Progress")
        history_nodes: set[str] = set()
        for h in graph.get_state_history(
            config={"configurable": {"thread_id": st.session_state.thread_id}}
        ):
            if h.next:
                history_nodes.add(h.next[0])

        current = state.next[0] if state.next else None
        for node_id, label in PIPELINE_NODES:
            if node_id == current:
                if state.tasks and state.tasks[0].interrupts:
                    st.warning(f"⏸️ **{label}** ← waiting for you")
                else:
                    st.info(f"▶️ **{label}** ← running")
            elif node_id in history_nodes:
                st.success(f"✅ {label}")
            else:
                st.markdown(f"⬜ {label}")

        st.divider()
        if not state.next:
            st.success("🎉 **Complete!**")

        with st.expander("🔧 Debug"):
            st.write("next:", state.next)
            if state.tasks:
                st.write("interrupts:", len(state.tasks[0].interrupts))
            st.write("thread_id:", st.session_state.thread_id)

# ── Main: interrupts ───────────────────────────────────────────────────────────
if state and state.next:
    interrupt_data = None
    if state.tasks and state.tasks[0].interrupts:
        interrupt_data = state.tasks[0].interrupts[0].value

    if interrupt_data is None:
        st.info(f"▶️ Processing **{node_label(state.next[0])}** … please wait.")
        st.stop()

    # Flight selection
    if isinstance(interrupt_data, dict) and interrupt_data.get("type") == "flight_selection":
        options = interrupt_data["options"]
        st.subheader("✈️ Choose Your Flight")
        st.caption(f"{len(options)} option(s) found. Review below, then select one.")

        labels = []
        for opt in options:
            price_s = f"₹{opt['price']:,.0f}" if opt.get("price", 0) > 0 else "Price N/A"
            stops_s = "Non-stop" if opt["stops"] == 0 else f"{opt['stops']} stop(s)"
            labels.append(
                f"{opt['category'].upper().replace('_',' ')}  |  "
                f"{opt['airline']}  |  {price_s}  |  {stops_s}"
            )
            render_flight_card(opt)

        chosen_label  = st.radio("Select your preferred flight:", labels, index=0)
        chosen_option = options[labels.index(chosen_label)]

        if st.button("✅ Confirm Flight Selection"):
            with st.spinner("Confirming…"):
                graph.invoke(
                    Command(resume={"selected_option": chosen_option["id"]}),
                    config={"configurable": {"thread_id": st.session_state.thread_id}},
                )
            st.rerun()

    # Manual flight
    elif isinstance(interrupt_data, dict) and interrupt_data.get("type") == "manual_flight_input":
        st.subheader("✍️ Manual Flight Preferences")
        st.warning(interrupt_data.get("message", "Unable to retrieve flights automatically."))
        airline      = st.text_input("Preferred Airline")
        direct       = st.checkbox("Direct Flights Only")
        budget_input = st.number_input("Max Flight Budget (₹)", min_value=0)
        if st.button("Submit Flight Preferences"):
            with st.spinner("Submitting…"):
                graph.invoke(
                    Command(resume={
                        "preferred_airline": airline,
                        "direct_only": direct,
                        "budget": budget_input,
                    }),
                    config={"configurable": {"thread_id": st.session_state.thread_id}},
                )
            st.rerun()

    # Review yes/no (single string interrupt)
    elif isinstance(interrupt_data, str):
        st.subheader("🔍 Review Your Itinerary")
        cur_itin = state.values.get("itinerary")
        if cur_itin:
            with st.expander("📄 View Current Itinerary", expanded=True):
                render_itinerary(cur_itin)

        remaining = MAX_REFINEMENTS - state.values.get("refinement_count", 0)
        st.caption(f"You have {remaining} refinement(s) remaining.")
        choice = st.radio(
            "Does this itinerary need improvement?",
            ["no", "yes"], index=0, key="review_radio",
        )
        if st.button("Submit Review Decision", key="btn_review"):
            with st.spinner("Submitting…"):
                graph.invoke(
                    Command(resume=choice),
                    config={"configurable": {"thread_id": st.session_state.thread_id}},
                )
            st.rerun()

    # Collect feedback
    elif isinstance(interrupt_data, dict) and interrupt_data.get("type") == "collect_feedback":
        st.subheader("✏️ What would you like changed?")
        itin_obj = interrupt_data.get("itinerary")
        if itin_obj and hasattr(itin_obj, "daily_plans"):
            with st.expander("📄 Current Itinerary", expanded=True):
                render_itinerary(itin_obj)
        feedback = st.text_area(
            "Describe your changes:",
            placeholder="e.g. Add a sunset cruise on Day 3, replace the fort visit with a waterfall hike…",
            key="feedback_text",
        )
        if st.button("Submit Feedback", key="btn_feedback"):
            if not feedback.strip():
                st.warning("Please enter some feedback before submitting.")
            else:
                with st.spinner("Refining itinerary…"):
                    graph.invoke(
                        Command(resume=feedback),
                        config={"configurable": {"thread_id": st.session_state.thread_id}},
                    )
                st.rerun()

    else:
        st.info(f"⏳ Agent is at **{node_label(state.next[0])}** — please wait.")

# ── Final: booking summary + itinerary ────────────────────────────────────────
elif state and not state.next:
    final = graph.get_state(
        config={"configurable": {"thread_id": st.session_state.thread_id}}
    )
    render_booking_summary(final.values)

    st.divider()
    if st.button("🔄 Plan Another Trip"):
        st.session_state.graph_started = False
        st.session_state.result        = None
        st.session_state.thread_id     = str(uuid.uuid4())
        st.rerun()