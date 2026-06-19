import json
from typing import List
from schema import PlannerState, TravelItinerary
from LLM_config import llm
from langchain_core.messages import HumanMessage
from langchain_community.tools.tavily_search import TavilySearchResults
from dotenv import load_dotenv

load_dotenv()

_search_tool = TavilySearchResults(max_results=5)


# ── Step 1: parse what the user actually wants changed ────────────────────────

def _extract_search_queries(
    feedback: str,
    destination: str,
    itinerary_summary: str,
) -> List[str]:
    """
    Ask the LLM to read the user feedback and the current itinerary,
    then produce a short list of targeted web-search queries that would
    supply real-world data needed to honour the feedback.
    Returns an empty list if no searches are needed.
    """
    prompt = f"""
A user is travelling to {destination} and has given feedback on their itinerary.
Your job is to decide what real-world information needs to be searched on the web
so the itinerary can be updated accurately.

=== CURRENT ITINERARY SUMMARY ===
{itinerary_summary}

=== USER FEEDBACK ===
{feedback}

=== TASK ===
Output a JSON array of search query strings (max 4).
Each query should be short and specific enough to return useful results,
e.g. "best seafood restaurants Goa beach 2025" or "entry fee Reis Magos Fort Goa".

Rules:
- Only generate queries for things the user explicitly asked to change.
- If the feedback is purely structural (e.g. "swap day 2 and day 3", "remove the museum"),
  no search is needed — return [].
- Do not generate queries about flights or hotels unless the user explicitly asks.
- Return ONLY the JSON array, nothing else.

Examples of good output:
["rooftop restaurants North Goa 2025", "Dudhsagar Falls entry fee timing"]
[]
"""
    response  = llm.invoke([HumanMessage(content=prompt)])
    raw       = response.content.strip()

    # strip fences
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    if raw.endswith("```"):
        raw = raw[: raw.rfind("```")].strip()

    try:
        queries = json.loads(raw)
        if isinstance(queries, list):
            return [str(q) for q in queries if q][:4]
    except Exception:
        pass

    return []


# ── Step 2: run the searches and build a context block ───────────────────────

def _run_searches(queries: List[str]) -> str:
    """Run each query with Tavily and return a combined context string."""
    if not queries:
        return ""

    sections = []
    for query in queries:
        print(f"[refinement] Searching: {query}")
        try:
            results = _search_tool.invoke(query)
            if isinstance(results, list):
                snippets = [
                    f"  • [{r.get('title', '')}] {r.get('content', '')[:300]}"
                    for r in results
                    if r.get("content")
                ]
                if snippets:
                    sections.append(
                        f"Query: {query}\n" + "\n".join(snippets)
                    )
        except Exception as e:
            print(f"[refinement] Search failed for '{query}': {e}")

    return "\n\n".join(sections)


# ── Step 3: refine the itinerary with grounded context ───────────────────────

def _refine_with_context(
    draft_json: str,
    feedback: str,
    search_context: str,
) -> str:
    """
    Ask the LLM to apply the user feedback to the itinerary,
    using real search results for grounding.
    Returns the raw JSON string of the refined itinerary.
    """
    context_section = (
        f"\n=== REAL-WORLD SEARCH RESULTS (use these to ground your edits) ===\n"
        f"{search_context}\n"
        if search_context
        else "\n(No web search was needed for this feedback — apply changes directly.)\n"
    )

    prompt = f"""
You are a travel itinerary editor. Apply the user's feedback to the itinerary below.
Return ONLY a valid JSON object with the exact same schema — no markdown, no explanation.
{context_section}
=== USER FEEDBACK ===
{feedback}

=== CURRENT ITINERARY (JSON) ===
{draft_json}

=== EDITING RULES ===
1. Apply the feedback precisely — do not change things the user did not mention.
2. Where the search results contain real names, prices, or timings, prefer those
   over invented data. Set estimated_cost / avg_cost_per_person to 0 if still unknown.
3. Keep hotel and selected_flight unchanged unless feedback explicitly asks for a change.
4. Preserve every field in the schema — do not drop any keys.
5. Return ONLY the updated JSON object.
"""
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content.strip()


# ── Main node ────────────────────────────────────────────────────────────────

def itinerary_refinement_node(state: PlannerState) -> PlannerState:

    print("\n========== ENTERED ITINERARY REFINEMENT NODE ==========")
    state["refinement_count"] += 1

    draft    = state["itinerary"]
    feedback = state["user_feedback"]
    destination = state["user_request"].destination

    # Build a brief summary of the current itinerary so the query-extractor
    # has context without needing the full JSON
    itinerary_summary = (
        f"Destination: {draft.destination}\n"
        f"Days: {len(draft.daily_plans)}\n"
        f"Activities per day: " +
        ", ".join(
            f"Day {d.day_number}: {[a.title for a in d.activities]}"
            for d in draft.daily_plans
        )
    )

    # ── 1. Decide what to search ──────────────────────────────────────────────
    print("[refinement] Extracting search queries from feedback…")
    queries = _extract_search_queries(feedback, destination, itinerary_summary)
    print(f"[refinement] Queries to run: {queries}")

    # ── 2. Run searches ───────────────────────────────────────────────────────
    search_context = _run_searches(queries)

    # ── 3. Refine with grounded context ───────────────────────────────────────
    print("[refinement] Applying feedback with search context…")
    draft_json = draft.model_dump_json(indent=2)
    raw_text   = _refine_with_context(draft_json, feedback, search_context)

    # Strip markdown fences if the model adds them
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()
    if raw_text.endswith("```"):
        raw_text = raw_text[: raw_text.rfind("```")].strip()

    # ── 4. Validate and update state ──────────────────────────────────────────
    try:
        data    = json.loads(raw_text)
        refined = TravelItinerary.model_validate(data)
        print("[refinement] Itinerary successfully refined and validated.")
    except Exception as e:
        print(f"[refinement] Parse/validate error: {e}")
        print(f"[refinement] Raw (first 500):\n{raw_text[:500]}")
        print("[refinement] Keeping original itinerary to avoid data loss.")
        refined = draft

    state["itinerary"] = refined

    print("\n========== EXITED ITINERARY REFINEMENT NODE ==========")
    return state