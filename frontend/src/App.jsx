// import React, { useState, useEffect, useRef, useCallback } from 'react';

// // ─────────────────────────────────────────────────────────────────────────────
// // DESIGN TOKENS
// // ─────────────────────────────────────────────────────────────────────────────
// const STYLE = `
// @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap');

// *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

// :root {
//   --parchment:   #F7F6F3;
//   --parchment-d: #EDEAE3;
//   --border:      #DDD9CF;
//   --ink:         #1A1A1A;
//   --ink-mid:     #4A4A4A;
//   --ink-muted:   #888680;
//   --green:       #2D5016;
//   --green-mid:   #3D6B1F;
//   --green-light: #EBF2E6;
//   --gold:        #8B6914;
//   --gold-light:  #F5EDD4;
//   --red:         #8B1A1A;
//   --red-light:   #F5E8E8;
//   --white:       #FFFFFF;

//   --font-serif:  'DM Serif Display', Georgia, serif;
//   --font-sans:   'Inter', system-ui, sans-serif;
//   --font-mono:   'DM Mono', 'Courier New', monospace;

//   --sidebar-w: 224px;
//   --radius-sm: 4px;
//   --radius:    8px;
//   --radius-lg: 12px;
//   --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
//   --shadow:    0 4px 12px rgba(0,0,0,0.08);
//   --transition: 140ms ease;
// }

// html, body, #root {
//   height: 100%;
//   background: var(--parchment);
//   color: var(--ink);
//   font-family: var(--font-sans);
//   font-size: 14px;
//   line-height: 1.55;
//   -webkit-font-smoothing: antialiased;
// }

// ::-webkit-scrollbar { width: 4px; }
// ::-webkit-scrollbar-track { background: transparent; }
// ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

// .shell { display: flex; height: 100vh; overflow: hidden; }

// /* ── Sidebar ── */
// .sidebar {
//   width: var(--sidebar-w);
//   flex-shrink: 0;
//   background: var(--white);
//   border-right: 1px solid var(--border);
//   display: flex;
//   flex-direction: column;
//   overflow: hidden;
// }
// .sidebar-top { padding: 20px 16px 14px; border-bottom: 1px solid var(--border); }
// .sidebar-wordmark { font-family: var(--font-serif); font-size: 20px; color: var(--ink); letter-spacing: -0.3px; line-height: 1.1; margin-bottom: 2px; }
// .sidebar-wordmark span { color: var(--green); }
// .sidebar-tagline { font-size: 11px; color: var(--ink-muted); letter-spacing: 0.01em; }
// .sidebar-section-label { padding: 14px 16px 6px; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-muted); }
// .sidebar-new-btn { margin: 0 12px 10px; padding: 8px 12px; background: var(--green-light); border: 1px solid rgba(45,80,22,0.2); border-radius: var(--radius-sm); color: var(--green); font-size: 12px; font-weight: 600; font-family: var(--font-sans); cursor: pointer; text-align: center; transition: background var(--transition); width: calc(100% - 24px); display: flex; align-items: center; justify-content: center; gap: 6px; }
// .sidebar-new-btn:hover { background: #dcecd2; }
// .session-list { flex: 1; overflow-y: auto; padding: 4px 8px 16px; display: flex; flex-direction: column; gap: 2px; }
// .session-item { padding: 8px 10px; border-radius: var(--radius-sm); cursor: pointer; border: 1px solid transparent; transition: all var(--transition); }
// .session-item:hover { background: var(--parchment); border-color: var(--border); }
// .session-item.active { background: var(--green-light); border-color: rgba(45,80,22,0.2); }
// .session-dest { font-size: 13px; font-weight: 500; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
// .session-item.active .session-dest { color: var(--green); }
// .session-meta { font-size: 11px; color: var(--ink-muted); margin-top: 2px; display: flex; align-items: center; gap: 6px; }
// .session-badge { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; padding: 1px 5px; border-radius: 10px; text-transform: uppercase; }
// .session-badge.done   { background: var(--green-light); color: var(--green); }
// .session-badge.active { background: var(--gold-light);  color: var(--gold);  }
// .empty-sessions { padding: 12px 16px; font-size: 12px; color: var(--ink-muted); font-style: italic; }

// /* ── Main ── */
// .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--parchment); }
// .main-topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 12px 28px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; min-height: 52px; }
// .main-topbar-title { font-size: 14px; font-weight: 500; color: var(--ink); }
// .main-topbar-sub { font-size: 11px; color: var(--ink-muted); margin-top: 1px; font-family: var(--font-mono); }
// .status-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-family: var(--font-mono); padding: 4px 10px; border-radius: 20px; border: 1px solid var(--border); background: var(--white); color: var(--ink-muted); white-space: nowrap; max-width: 240px; overflow: hidden; text-overflow: ellipsis; }
// .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); flex-shrink: 0; }
// .status-dot.working { background: var(--gold); animation: breathe 1.4s ease infinite; }
// .status-dot.done    { background: #3D6B1F; }
// .status-dot.error   { background: var(--red); }
// @keyframes breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

// /* ── Feed ── */
// .feed-wrap { flex: 1; overflow-y: auto; padding: 28px 28px 40px; }
// .feed-inner { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 0; }
// .feed-empty { max-width: 480px; margin: 80px auto 0; text-align: center; }
// .feed-empty-sub { font-size: 14px; color: var(--ink-muted); line-height: 1.6; }

// /* ── Timeline ── */
// .tl-entry { display: flex; align-items: flex-start; gap: 14px; position: relative; padding-bottom: 4px; }
// .tl-entry:not(.tl-entry-last)::after { content: ''; position: absolute; left: 11px; top: 24px; bottom: 0; width: 1px; background: var(--border); }
// .tl-entry.tl-done::after { background: var(--green); opacity: 0.35; }
// .tl-dot { width: 23px; height: 23px; border-radius: 50%; flex-shrink: 0; border: 2px solid var(--border); background: var(--white); display: flex; align-items: center; justify-content: center; margin-top: 1px; position: relative; z-index: 1; transition: all var(--transition); }
// .tl-dot.done    { border-color: var(--green); background: var(--green-light); }
// .tl-dot.waiting { border-color: var(--gold);  background: var(--gold-light);  }
// .tl-dot.running { border-color: var(--gold);  background: var(--white); }
// .tl-dot.error   { border-color: var(--red);   background: var(--red-light); }
// .tl-spinner { width: 10px; height: 10px; border: 1.5px solid var(--border); border-top-color: var(--gold); border-radius: 50%; animation: spin 0.7s linear infinite; }
// @keyframes spin { to { transform: rotate(360deg); } }
// .tl-check { width: 10px; height: 10px; color: var(--green); }
// .tl-body { flex: 1; padding-bottom: 20px; min-width: 0; }
// .tl-node-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; padding-top: 2px; }
// .tl-node-name { font-family: var(--font-mono); font-size: 11px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-muted); }
// .tl-node-name.done    { color: var(--green); }
// .tl-node-name.waiting { color: var(--gold);  }
// .tl-node-name.running { color: var(--gold);  }
// .tl-node-label { font-size: 13px; color: var(--ink-mid); }
// .tl-node-label.running { color: var(--ink); font-weight: 500; }

// /* ── Cards ── */
// .card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm); margin-top: 4px; }
// .card-header { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
// .card-header-left { display: flex; align-items: center; gap: 8px; }
// .card-header-icon { font-size: 14px; }
// .card-title { font-size: 13px; font-weight: 600; color: var(--ink); }
// .card-hint  { font-size: 11px; color: var(--ink-muted); }
// .card-body  { padding: 16px; }
// .card.resolved { opacity: 0.5; pointer-events: none; }
// .card.resolved .card-header { background: var(--parchment); }
// .resolved-tag { font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-muted); background: var(--parchment-d); padding: 2px 7px; border-radius: 10px; }

// /* ── Flight selection ── */
// .flight-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
// .flight-opt { border: 1.5px solid var(--border); border-radius: var(--radius); padding: 12px 14px; cursor: pointer; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 16px; transition: border-color var(--transition), background var(--transition); }
// .flight-opt:hover { border-color: var(--green-mid); background: var(--green-light); }
// .flight-opt.sel   { border-color: var(--green);     background: var(--green-light); }
// .flight-category { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); margin-bottom: 3px; }
// .flight-airline  { font-size: 14px; font-weight: 500; color: var(--ink); }
// .flight-details  { font-size: 11px; color: var(--ink-muted); font-family: var(--font-mono); margin-top: 2px; }
// .flight-price    { text-align: right; }
// .flight-price-amt { font-size: 18px; font-weight: 600; color: var(--ink); font-family: var(--font-serif); }
// .flight-price-sub { font-size: 10px; color: var(--ink-muted); margin-top: 1px; }

// /* ── Review ── */
// .review-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
// .review-opt { padding: 10px 14px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); text-align: center; cursor: pointer; font-size: 13px; color: var(--ink-mid); background: var(--parchment); transition: all var(--transition); font-family: var(--font-sans); }
// .review-opt:hover { border-color: var(--green-mid); }
// .review-opt.sel-yes { border-color: var(--gold);  background: var(--gold-light);  color: var(--gold); }
// .review-opt.sel-no  { border-color: var(--green); background: var(--green-light); color: var(--green); }
// .refinements-left { font-size: 11px; color: var(--ink-muted); margin-bottom: 10px; font-family: var(--font-mono); }

// /* ── Fields ── */
// .field { margin-bottom: 12px; }
// .field label { display: block; font-size: 11px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 5px; }
// .field input, .field textarea, .field select { width: 100%; padding: 8px 11px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); background: var(--parchment); color: var(--ink); font-family: var(--font-sans); font-size: 13px; outline: none; transition: border-color var(--transition); }
// .field input:focus, .field textarea:focus, .field select:focus { border-color: var(--green-mid); background: var(--white); }
// .field input::placeholder, .field textarea::placeholder { color: var(--ink-muted); }
// .field textarea { resize: vertical; min-height: 72px; }
// .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
// .checkbox-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
// .checkbox-row input[type=checkbox] { width: 15px; height: 15px; accent-color: var(--green); }
// .checkbox-row label { font-size: 13px; color: var(--ink-mid); cursor: pointer; }

// /* ── Buttons ── */
// .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: none; border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: 13px; font-weight: 500; cursor: pointer; transition: all var(--transition); padding: 9px 18px; white-space: nowrap; }
// .btn:disabled { opacity: 0.4; cursor: not-allowed; }
// .btn-primary  { background: var(--green); color: var(--white); }
// .btn-primary:hover:not(:disabled) { background: var(--green-mid); }
// .btn-ghost    { background: transparent; color: var(--ink-mid); border: 1.5px solid var(--border); }
// .btn-ghost:hover:not(:disabled)   { border-color: var(--green-mid); color: var(--green); }
// .btn-gold     { background: var(--gold); color: var(--white); }
// .btn-gold:hover:not(:disabled)    { background: #7a5c10; }
// .btn-row { display: flex; gap: 8px; flex-wrap: wrap; }

// /* ── Itinerary ── */
// .itin-dest { font-family: var(--font-serif); font-size: 26px; color: var(--ink); letter-spacing: -0.5px; margin-bottom: 3px; }
// .itin-meta { font-size: 12px; color: var(--ink-muted); font-family: var(--font-mono); margin-bottom: 20px; }
// .itin-section { margin-bottom: 22px; }
// .itin-section-head { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-muted); border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 12px; }
// .hotel-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
// .hotel-name { font-size: 15px; font-weight: 600; color: var(--ink); }
// .hotel-loc  { font-size: 12px; color: var(--ink-muted); margin-top: 2px; }
// .hotel-rating { font-size: 12px; color: var(--gold); margin-top: 2px; }
// .hotel-links { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
// .hotel-link-btn { font-size: 11px; color: var(--green); text-decoration: underline; cursor: pointer; background: none; border: none; font-family: var(--font-sans); padding: 0; }
// .flight-legs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
// .flight-leg { background: var(--parchment); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; }
// .leg-dir     { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 4px; }
// .leg-airline { font-size: 13px; font-weight: 500; color: var(--ink); }
// .leg-times   { font-family: var(--font-mono); font-size: 11px; color: var(--ink-mid); margin-top: 3px; }
// .leg-price   { font-size: 13px; color: var(--gold); font-weight: 600; margin-top: 4px; font-family: var(--font-mono); }
// .day-card { border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 8px; overflow: hidden; }
// .day-card-head { display: flex; align-items: center; justify-content: space-between; padding: 9px 14px; background: var(--parchment-d); cursor: pointer; user-select: none; }
// .day-card-title   { font-size: 13px; font-weight: 600; color: var(--ink); }
// .day-card-weather { font-size: 11px; color: var(--ink-muted); font-family: var(--font-mono); }
// .day-card-caret   { font-size: 10px; color: var(--ink-muted); }
// .day-card-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
// .activity { display: grid; grid-template-columns: 80px 1fr; gap: 12px; align-items: flex-start; }
// .activity-time  { font-family: var(--font-mono); font-size: 11px; color: var(--gold); padding-top: 2px; white-space: nowrap; }
// .activity-title { font-size: 13px; font-weight: 500; color: var(--ink); }
// .activity-loc   { font-size: 11px; color: var(--ink-muted); margin-top: 1px; }
// .activity-cost  { font-size: 11px; color: var(--ink-mid); margin-top: 2px; font-family: var(--font-mono); }
// .activity-notes { font-size: 11px; color: var(--ink-muted); margin-top: 2px; font-style: italic; }
// .tips-list { list-style: none; display: flex; flex-direction: column; gap: 5px; }
// .tips-list li { font-size: 12px; color: var(--ink-mid); padding-left: 16px; position: relative; }
// .tips-list li::before { content: '—'; position: absolute; left: 0; color: var(--gold); }

// /* ── Booking summary ── */
// .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
// .summary-cell { background: var(--parchment); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; }
// .summary-cell-head  { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 5px; }
// .summary-cell-name  { font-size: 14px; font-weight: 600; color: var(--ink); }
// .summary-cell-sub   { font-size: 11px; color: var(--ink-muted); margin-top: 2px; }
// .summary-cell-price { font-size: 20px; font-family: var(--font-serif); color: var(--green); margin-top: 5px; }
// .summary-total { background: var(--green-light); border: 1px solid rgba(45,80,22,0.2); border-radius: var(--radius-sm); padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
// .summary-total-label  { font-size: 13px; font-weight: 500; color: var(--ink-mid); }
// .summary-total-amount { font-size: 28px; font-family: var(--font-serif); color: var(--green); line-height: 1; }
// .checkout-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
// .checkout-link { display: block; padding: 11px 14px; border-radius: var(--radius-sm); text-align: center; font-size: 13px; font-weight: 600; text-decoration: none; transition: opacity var(--transition); }
// .checkout-link:hover { opacity: 0.85; text-decoration: none; }
// .checkout-flight { background: var(--ink);   color: var(--white); }
// .checkout-hotel  { background: var(--green); color: var(--white); }
// .avail-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
// .avail-tag  { display: flex; align-items: center; gap: 5px; font-size: 11px; padding: 5px 10px; border-radius: var(--radius-sm); }
// .avail-ok   { background: var(--green-light); color: var(--green); border: 1px solid rgba(45,80,22,0.15); }
// .avail-warn { background: var(--red-light);   color: var(--red);   border: 1px solid rgba(139,26,26,0.15); }

// /* ── Form ── */
// .form-wrap  { flex: 1; overflow-y: auto; padding: 32px 28px 48px; }
// .form-inner { max-width: 600px; margin: 0 auto; }
// .form-heading { font-family: var(--font-serif); font-size: 30px; color: var(--ink); letter-spacing: -0.5px; margin-bottom: 4px; line-height: 1.15; }
// .form-sub     { font-size: 14px; color: var(--ink-muted); margin-bottom: 28px; }
// .chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
// .chip { padding: 4px 11px; border: 1.5px solid var(--border); border-radius: 20px; font-size: 12px; color: var(--ink-muted); background: var(--white); cursor: pointer; transition: all var(--transition); user-select: none; font-family: var(--font-sans); }
// .chip:hover { border-color: var(--green-mid); color: var(--green); }
// .chip.on    { border-color: var(--green); color: var(--green); background: var(--green-light); }
// .form-divider { border: none; border-top: 1px solid var(--border); margin: 20px 0; }
// .error-msg { background: var(--red-light); border: 1px solid rgba(139,26,26,0.2); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 12px; color: var(--red); margin-bottom: 14px; }

// /* ── Skeleton ── */
// .skeleton { animation: shimmer 1.4s ease infinite; }
// @keyframes shimmer { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
// .skeleton-line { height: 11px; background: var(--border); border-radius: 4px; margin-bottom: 6px; }
// .working-node { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; margin-top: 4px; }
// `;

// // ─────────────────────────────────────────────────────────────────────────────
// const BASE_URL = 'http://localhost:8000';

// const NODE_META = {
//   get_weather:             { label: 'Weather forecast',       emoji: '🌤' },
//   get_attractions:         { label: 'Discovering attractions', emoji: '🗺' },
//   attraction_ranking_node: { label: 'Ranking attractions',    emoji: '⭐' },
//   get_hotels:              { label: 'Searching hotels',       emoji: '🏨' },
//   hotel_ranking_node:      { label: 'Selecting best hotel',   emoji: '🏆' },
//   flight_discovery:        { label: 'Searching flights',      emoji: '✈' },
//   flight_selection:        { label: 'Choose a flight',        emoji: '🎫' },
//   manual_flight_input:     { label: 'Enter flight details',   emoji: '✍' },
//   draft_itinerary:         { label: 'Drafting itinerary',     emoji: '📝' },
//   review_decision:         { label: 'Review itinerary',       emoji: '◎' },
//   collect_feedback:        { label: 'Your feedback',          emoji: '✏' },
//   refine_node:             { label: 'Refining itinerary',     emoji: '🔁' },
//   booking_verification:    { label: 'Verifying availability', emoji: '🔍' },
//   timeline_repair:         { label: 'Adjusting timeline',     emoji: '🔧' },
//   checkout_link_generator: { label: 'Generating links',       emoji: '🔗' },
//   booking_summary:         { label: 'Booking summary',        emoji: '🎟' },
// };

// const INTERESTS     = ['beaches','nightlife','shopping','museums','hiking','historical sites','local food'];
// const DIETARY       = ['vegetarian','vegan','jain','halal','gluten-free'];
// const TRAVEL_STYLES = ['budget','balanced','luxury','family','adventure','romantic'];

// const fmt = (n) => n > 0 ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

// // ─────────────────────────────────────────────────────────────────────────────
// // Classify an interrupt payload into a frontend type string.
// // The backend now sends dicts for ALL interrupt types — never a bare string.
// // ─────────────────────────────────────────────────────────────────────────────
// function classifyInterrupt(iv) {
//   if (!iv) return 'unknown';
//   if (typeof iv === 'string') return 'review_decision'; // legacy safety
//   if (iv.type === 'review_decision')   return 'review_decision';
//   if (iv.type === 'flight_selection')  return 'flight_selection';
//   if (iv.type === 'manual_flight_input') return 'manual_flight_input';
//   if (iv.type === 'collect_feedback')  return 'collect_feedback';
//   return 'unknown';
// }

// // ─────────────────────────────────────────────────────────────────────────────
// async function apiPost(path, body) {
//   const res = await fetch(`${BASE_URL}${path}`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body),
//   });
//   if (!res.ok) throw new Error(await res.text());
//   return res.json();
// }
// async function apiGet(path) {
//   const res = await fetch(`${BASE_URL}${path}`);
//   if (!res.ok) throw new Error(await res.text());
//   return res.json();
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // SVG icons
// // ─────────────────────────────────────────────────────────────────────────────
// const CheckIcon = () => (
//   <svg className="tl-check" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//     <polyline points="2,6 5,9 10,3" />
//   </svg>
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // SIDEBAR
// // ─────────────────────────────────────────────────────────────────────────────
// function Sidebar({ sessions, activeId, onSelect, onNew }) {
//   return (
//     <aside className="sidebar">
//       <div className="sidebar-top">
//         <div className="sidebar-wordmark">wayfind<span>.</span></div>
//         <div className="sidebar-tagline">AI trip planning</div>
//       </div>
//       <div className="sidebar-section-label">Trips</div>
//       <button className="sidebar-new-btn" onClick={onNew}><span>+</span> New trip</button>
//       <div className="session-list">
//         {sessions.length === 0 && <div className="empty-sessions">No trips yet.</div>}
//         {sessions.map((s) => (
//           <div
//             key={s.thread_id}
//             className={`session-item ${activeId === s.thread_id ? 'active' : ''}`}
//             onClick={() => onSelect(s.thread_id)}
//           >
//             <div className="session-dest">{s.destination || 'Unknown'}</div>
//             <div className="session-meta">
//               <span>{s.source || '—'}</span>
//               <span className={`session-badge ${s.is_done ? 'done' : 'active'}`}>
//                 {s.is_done ? 'Done' : 'Active'}
//               </span>
//             </div>
//           </div>
//         ))}
//       </div>
//     </aside>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// function TlDot({ status }) {
//   return (
//     <div className={`tl-dot ${status}`}>
//       {status === 'done'    && <CheckIcon />}
//       {status === 'running' && <div className="tl-spinner" />}
//       {status === 'waiting' && <span style={{ fontSize: 8, color: 'var(--gold)' }}>●</span>}
//       {status === 'error'   && <span style={{ fontSize: 9, color: 'var(--red)' }}>✕</span>}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // FLIGHT SELECTION CARD
// // ─────────────────────────────────────────────────────────────────────────────
// function FlightCard({ entry, onResume }) {
//   const [sel, setSel] = useState(null);
//   const opts = entry.interruptData?.options || [];

//   if (entry.resolved) {
//     return (
//       <div className="card resolved">
//         <div className="card-header">
//           <div className="card-header-left"><span className="card-header-icon">✈</span><span className="card-title">Flight selected</span></div>
//           <span className="resolved-tag">resolved</span>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="card">
//       <div className="card-header">
//         <div className="card-header-left"><span className="card-header-icon">✈</span><span className="card-title">Choose your flight</span></div>
//         <span className="card-hint">{opts.length} option{opts.length !== 1 ? 's' : ''}</span>
//       </div>
//       <div className="card-body">
//         <div className="flight-grid">
//           {opts.map((opt) => (
//             <div key={opt.id} className={`flight-opt ${sel === opt.id ? 'sel' : ''}`} onClick={() => setSel(opt.id)}>
//               <div>
//                 <div className="flight-category">{opt.category?.replace('_', ' ')}</div>
//                 <div className="flight-airline">{opt.airline}</div>
//                 <div className="flight-details">
//                   {opt.departure} → {opt.arrival} &nbsp;·&nbsp; {opt.duration} &nbsp;·&nbsp;
//                   {opt.stops === 0 ? 'Non-stop' : `${opt.stops} stop`}
//                 </div>
//               </div>
//               <div className="flight-price">
//                 <div className="flight-price-amt">{opt.price > 0 ? fmt(opt.price) : '—'}</div>
//                 <div className="flight-price-sub">round trip</div>
//               </div>
//             </div>
//           ))}
//         </div>
//         <div className="btn-row">
//           <button className="btn btn-primary" disabled={!sel} onClick={() => sel && onResume({ selected_option: sel })}>
//             Confirm selection →
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // MANUAL FLIGHT CARD
// // ─────────────────────────────────────────────────────────────────────────────
// function ManualFlightCard({ entry, onResume }) {
//   const [airline, setAirline] = useState('');
//   const [budget, setBudget]   = useState('');
//   const [direct, setDirect]   = useState(false);

//   if (entry.resolved) {
//     return (
//       <div className="card resolved">
//         <div className="card-header">
//           <div className="card-header-left"><span className="card-header-icon">✍</span><span className="card-title">Flight preferences submitted</span></div>
//           <span className="resolved-tag">resolved</span>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="card">
//       <div className="card-header">
//         <div className="card-header-left"><span className="card-header-icon">✍</span><span className="card-title">Enter flight preferences</span></div>
//         <span className="card-hint">manual entry</span>
//       </div>
//       <div className="card-body">
//         <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 14 }}>
//           Couldn't retrieve live flights. Enter your preferences and we'll plan around them.
//         </p>
//         <div className="field">
//           <label>Preferred airline</label>
//           <input value={airline} onChange={e => setAirline(e.target.value)} placeholder="e.g. IndiGo, Air India" />
//         </div>
//         <div className="field-row" style={{ marginBottom: 12 }}>
//           <div className="field" style={{ marginBottom: 0 }}>
//             <label>Max budget (₹)</label>
//             <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="12000" />
//           </div>
//         </div>
//         <div className="checkbox-row">
//           <input type="checkbox" id="direct" checked={direct} onChange={e => setDirect(e.target.checked)} />
//           <label htmlFor="direct">Direct flights only</label>
//         </div>
//         <button className="btn btn-primary" onClick={() => onResume({ preferred_airline: airline, budget: Number(budget), direct_only: direct })}>
//           Submit
//         </button>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // REVIEW CARD
// // Now receives the itinerary embedded in interruptData and renders it above
// // the approve/reject buttons.
// // ─────────────────────────────────────────────────────────────────────────────
// function ReviewCard({ entry, onResume, refinementsUsed, maxRefinements }) {
//   const [choice, setChoice] = useState('no');
//   const remaining = maxRefinements - refinementsUsed;
//   // The backend now sends { type, message, itinerary } for review_decision
//   const itin = entry.interruptData?.itinerary || null;

//   if (entry.resolved) {
//     return (
//       <div className="card resolved">
//         <div className="card-header">
//           <div className="card-header-left"><span className="card-header-icon">◎</span><span className="card-title">Review submitted</span></div>
//           <span className="resolved-tag">resolved</span>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <>
//       {/* Show the itinerary inline, above the review card */}
//       {itin && <ItineraryCard itin={itin} />}

//       <div className="card" style={{ marginTop: 10 }}>
//         <div className="card-header">
//           <div className="card-header-left"><span className="card-header-icon">◎</span><span className="card-title">Does this itinerary look right?</span></div>
//           <span className="card-hint">{remaining} revision{remaining !== 1 ? 's' : ''} left</span>
//         </div>
//         <div className="card-body">
//           <p className="refinements-left">
//             {refinementsUsed > 0 && `${refinementsUsed} revision${refinementsUsed !== 1 ? 's' : ''} used · `}
//             {remaining} remaining
//           </p>
//           <div className="review-toggle">
//             <div className={`review-opt ${choice === 'no' ? 'sel-no' : ''}`} onClick={() => setChoice('no')}>
//               Looks good
//             </div>
//             <div
//               className={`review-opt ${choice === 'yes' ? 'sel-yes' : ''}`}
//               onClick={() => remaining > 0 && setChoice('yes')}
//               style={{ opacity: remaining === 0 ? 0.4 : 1, cursor: remaining === 0 ? 'not-allowed' : 'pointer' }}
//               title={remaining === 0 ? 'No revisions remaining' : ''}
//             >
//               Request changes
//             </div>
//           </div>
//           <div className="btn-row">
//             <button className="btn btn-primary" onClick={() => onResume(choice)}>
//               {choice === 'no' ? 'Approve & continue →' : 'Continue to feedback'}
//             </button>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // FEEDBACK CARD
// // ─────────────────────────────────────────────────────────────────────────────
// function FeedbackCard({ entry, onResume }) {
//   const [text, setText] = useState('');

//   if (entry.resolved) {
//     return (
//       <div className="card resolved">
//         <div className="card-header">
//           <div className="card-header-left"><span className="card-header-icon">✏</span><span className="card-title">Feedback submitted</span></div>
//           <span className="resolved-tag">resolved</span>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="card">
//       <div className="card-header">
//         <div className="card-header-left"><span className="card-header-icon">✏</span><span className="card-title">What would you like changed?</span></div>
//       </div>
//       <div className="card-body">
//         <div className="field">
//           <textarea value={text} onChange={e => setText(e.target.value)} placeholder="e.g. More beach time on Day 2, add a sunset cruise, fewer museums…" />
//         </div>
//         <div className="btn-row">
//           <button className="btn btn-primary" disabled={!text.trim()} onClick={() => onResume(text.trim())}>
//             Submit feedback
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // DAY CARD
// // ─────────────────────────────────────────────────────────────────────────────
// function DayCard({ day }) {
//   const [open, setOpen] = useState(true);
//   return (
//     <div className="day-card">
//       <div className="day-card-head" onClick={() => setOpen(o => !o)}>
//         <div>
//           <div className="day-card-title">Day {day.day_number} · {day.date}</div>
//           <div className="day-card-weather">{day.weather_summary}</div>
//         </div>
//         <span className="day-card-caret">{open ? '▲' : '▼'}</span>
//       </div>
//       {open && (
//         <div className="day-card-body">
//           {(day.activities || []).map((act, i) => (
//             <div key={i} className="activity">
//               <div className="activity-time">{act.time_slot}</div>
//               <div>
//                 <div className="activity-title">{act.title}</div>
//                 <div className="activity-loc">{act.location}</div>
//                 {act.estimated_cost > 0 && <div className="activity-cost">{fmt(act.estimated_cost)}</div>}
//                 {act.notes && <div className="activity-notes">{act.notes}</div>}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // ITINERARY CARD
// // ─────────────────────────────────────────────────────────────────────────────
// function ItineraryCard({ itin }) {
//   if (!itin) return null;
//   const out = itin.selected_flight?.outbound_flight;
//   const ret = itin.selected_flight?.return_flight;
//   return (
//     <div className="card">
//       <div className="card-header">
//         <div className="card-header-left"><span className="card-header-icon">📋</span><span className="card-title">Your itinerary</span></div>
//         {itin.total_estimated_cost > 0 && <span className="card-hint">~{fmt(itin.total_estimated_cost)}</span>}
//       </div>
//       <div className="card-body">
//         <div className="itin-dest">{itin.destination}</div>

//         {itin.hotel && (
//           <div className="itin-section">
//             <div className="itin-section-head">Hotel</div>
//             <div className="hotel-row">
//               <div>
//                 <div className="hotel-name">{itin.hotel.name}</div>
//                 <div className="hotel-loc">{itin.hotel.location}</div>
//                 {itin.hotel.rating > 0 && <div className="hotel-rating">{'★'.repeat(Math.round(itin.hotel.rating * 5))} {itin.hotel.rating.toFixed(2)}</div>}
//                 {itin.hotel.price_per_night > 0 && <div className="hotel-loc" style={{ marginTop: 3 }}>{fmt(itin.hotel.price_per_night)}/night</div>}
//               </div>
//               {itin.hotel.booking_platforms?.length > 0 && (
//                 <div className="hotel-links">
//                   {itin.hotel.booking_platforms.slice(0, 3).map((p, i) => (
//                     <a key={i} href={p.url} target="_blank" rel="noreferrer" className="hotel-link-btn">{p.platform} ↗</a>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         {out && (
//           <div className="itin-section">
//             <div className="itin-section-head">Flights</div>
//             <div className="flight-legs">
//               {[['Outbound', out], ['Return', ret]].map(([dir, leg]) => leg ? (
//                 <div key={dir} className="flight-leg">
//                   <div className="leg-dir">{dir}</div>
//                   <div className="leg-airline">{leg.airline}</div>
//                   <div className="leg-times">{leg.source} → {leg.destination}<br />{leg.departure_time} → {leg.arrival_time} · {leg.duration}</div>
//                   {leg.price > 0 && <div className="leg-price">{fmt(leg.price)}</div>}
//                 </div>
//               ) : null)}
//             </div>
//           </div>
//         )}

//         {itin.daily_plans?.length > 0 && (
//           <div className="itin-section">
//             <div className="itin-section-head">Day by day</div>
//             {itin.daily_plans.map(day => <DayCard key={day.day_number} day={day} />)}
//           </div>
//         )}

//         {itin.travel_tips?.length > 0 && (
//           <div className="itin-section">
//             <div className="itin-section-head">Travel tips</div>
//             <ul className="tips-list">{itin.travel_tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // BOOKING SUMMARY CARD
// // ─────────────────────────────────────────────────────────────────────────────
// function BookingSummaryCard({ summary, verification }) {
//   if (!summary) return null;
//   const fv = verification?.flight;
//   const hv = verification?.hotel;
//   return (
//     <div className="card">
//       <div className="card-header">
//         <div className="card-header-left"><span className="card-header-icon">🎟</span><span className="card-title">Ready to book</span></div>
//         <span className="card-hint">final summary</span>
//       </div>
//       <div className="card-body">
//         {(fv || hv) && (
//           <div className="avail-row">
//             <div className={`avail-tag ${fv?.is_available !== false ? 'avail-ok' : 'avail-warn'}`}>{fv?.is_available !== false ? '✓' : '!'} Flight confirmed</div>
//             <div className={`avail-tag ${hv?.is_available !== false ? 'avail-ok' : 'avail-warn'}`}>{hv?.is_available !== false ? '✓' : '!'} Hotel confirmed</div>
//           </div>
//         )}
//         <div className="summary-grid">
//           <div className="summary-cell">
//             <div className="summary-cell-head">Flight</div>
//             <div className="summary-cell-name">{summary.flight_airline}{summary.flight_number ? ` ${summary.flight_number}` : ''}</div>
//             {summary.flight_price_per_person > 0 && <div className="summary-cell-sub">{fmt(summary.flight_price_per_person)} × {summary.num_people} × 2 legs</div>}
//             {summary.flight_total_price > 0 && <div className="summary-cell-price">{fmt(summary.flight_total_price)}</div>}
//           </div>
//           <div className="summary-cell">
//             <div className="summary-cell-head">Hotel</div>
//             <div className="summary-cell-name">{summary.hotel_name}</div>
//             <div className="summary-cell-sub">{summary.hotel_room_type}</div>
//             {summary.hotel_price_per_night > 0 && <div className="summary-cell-sub">{fmt(summary.hotel_price_per_night)}/night × {summary.hotel_nights} nights</div>}
//             {summary.hotel_total_price > 0 && <div className="summary-cell-price">{fmt(summary.hotel_total_price)}</div>}
//           </div>
//         </div>
//         {summary.grand_total > 0 && (
//           <div className="summary-total">
//             <span className="summary-total-label">Total estimated cost</span>
//             <span className="summary-total-amount">{fmt(summary.grand_total)}</span>
//           </div>
//         )}
//         <div className="checkout-row">
//           <a href={summary.flight_checkout_url} target="_blank" rel="noreferrer" className="checkout-link checkout-flight">Book flight →</a>
//           <a href={summary.hotel_checkout_url}  target="_blank" rel="noreferrer" className="checkout-link checkout-hotel">Book hotel →</a>
//         </div>
//         <p style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
//           Each link opens the booking platform directly. Review the details and complete payment there.
//         </p>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// function WorkingSkeleton({ label }) {
//   return (
//     <div className="working-node skeleton">
//       <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', marginBottom: 8 }}>{label || 'Working…'}</div>
//       <div className="skeleton-line" style={{ width: '60%' }} />
//       <div className="skeleton-line" style={{ width: '40%' }} />
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // TIMELINE ENTRY
// // ─────────────────────────────────────────────────────────────────────────────
// function TlEntry({ entry, isLast, onResume, refinementsUsed, maxRefinements, fullState }) {
//   const meta   = NODE_META[entry.node] || { label: entry.node, emoji: '·' };
//   const status = entry.status;

//   return (
//     <div className={`tl-entry tl-${status} ${isLast ? 'tl-entry-last' : ''}`}>
//       <TlDot status={status} />
//       <div className="tl-body">
//         <div className="tl-node-row">
//           <span className={`tl-node-name ${status}`}>{meta.emoji} {entry.node}</span>
//           <span className={`tl-node-label ${status}`}>{meta.label}</span>
//         </div>

//         {status === 'running' && !entry.interruptData && (
//           <WorkingSkeleton label={`${meta.label}…`} />
//         )}

//         {entry.interruptData && entry.type === 'flight_selection' && (
//           <FlightCard entry={entry} onResume={onResume} />
//         )}
//         {entry.interruptData && entry.type === 'manual_flight_input' && (
//           <ManualFlightCard entry={entry} onResume={onResume} />
//         )}
//         {entry.interruptData && entry.type === 'review_decision' && (
//           <ReviewCard
//             entry={entry}
//             onResume={onResume}
//             refinementsUsed={refinementsUsed}
//             maxRefinements={maxRefinements}
//           />
//         )}
//         {entry.interruptData && entry.type === 'collect_feedback' && (
//           <FeedbackCard entry={entry} onResume={onResume} />
//         )}

//         {entry.type === 'itinerary' && entry.payload && (
//           <ItineraryCard itin={entry.payload} />
//         )}
//         {entry.type === 'booking_summary' && entry.payload && (
//           <BookingSummaryCard summary={entry.payload} verification={fullState?.booking_verification} />
//         )}

//         {status === 'error' && (
//           <div className="error-msg" style={{ marginTop: 6 }}>
//             {entry.errorMsg || 'An unexpected error occurred.'}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// function ChipGroup({ options, selected, onChange }) {
//   const toggle = (opt) =>
//     onChange(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]);
//   return (
//     <div className="chip-row">
//       {options.map(opt => (
//         <span key={opt} className={`chip ${selected.includes(opt) ? 'on' : ''}`} onClick={() => toggle(opt)}>
//           {opt}
//         </span>
//       ))}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // TRIP FORM
// // ─────────────────────────────────────────────────────────────────────────────
// function TripForm({ onSubmit, isLoading }) {
//   const today = new Date().toISOString().split('T')[0];
//   const [form, setForm] = useState({
//     source: 'Delhi', destination: 'Goa',
//     start_date: '', end_date: '',
//     num_people: 2, budget: 50000,
//     travel_style: 'balanced', flexibility_tolerance: 'medium',
//     interests: [], dietary_restrictions: [], accessibility_needs: [],
//   });
//   const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
//   const valid = form.source && form.destination && form.start_date && form.end_date;

//   return (
//     <div className="form-wrap">
//       <div className="form-inner">
//         <h1 className="form-heading">Where are you going?</h1>
//         <p className="form-sub">Tell the agent your trip details. It will research flights, hotels, and attractions — then draft a full itinerary for you to review.</p>

//         <div className="field-row" style={{ marginBottom: 12 }}>
//           <div className="field" style={{ marginBottom: 0 }}><label>From</label><input value={form.source} onChange={e => set('source', e.target.value)} placeholder="Delhi" /></div>
//           <div className="field" style={{ marginBottom: 0 }}><label>To</label><input value={form.destination} onChange={e => set('destination', e.target.value)} placeholder="Goa" /></div>
//         </div>
//         <div className="field-row" style={{ marginBottom: 12 }}>
//           <div className="field" style={{ marginBottom: 0 }}><label>Departure</label><input type="date" min={today} value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
//           <div className="field" style={{ marginBottom: 0 }}><label>Return</label><input type="date" min={form.start_date || today} value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div>
//         </div>
//         <div className="field-row" style={{ marginBottom: 12 }}>
//           <div className="field" style={{ marginBottom: 0 }}><label>Travellers</label><input type="number" min={1} max={20} value={form.num_people} onChange={e => set('num_people', +e.target.value)} /></div>
//           <div className="field" style={{ marginBottom: 0 }}><label>Budget (₹)</label><input type="number" min={0} step={1000} value={form.budget} onChange={e => set('budget', +e.target.value)} /></div>
//         </div>
//         <div className="field-row" style={{ marginBottom: 12 }}>
//           <div className="field" style={{ marginBottom: 0 }}>
//             <label>Travel style</label>
//             <select value={form.travel_style} onChange={e => set('travel_style', e.target.value)}>
//               {TRAVEL_STYLES.map(s => <option key={s}>{s}</option>)}
//             </select>
//           </div>
//           <div className="field" style={{ marginBottom: 0 }}>
//             <label>Flexibility</label>
//             <select value={form.flexibility_tolerance} onChange={e => set('flexibility_tolerance', e.target.value)}>
//               <option>low</option><option>medium</option><option>high</option>
//             </select>
//           </div>
//         </div>
//         <div className="field"><label>Interests</label><ChipGroup options={INTERESTS} selected={form.interests} onChange={v => set('interests', v)} /></div>
//         <div className="field"><label>Dietary</label><ChipGroup options={DIETARY} selected={form.dietary_restrictions} onChange={v => set('dietary_restrictions', v)} /></div>
//         <div className="field">
//           <label>Accessibility needs</label>
//           <ChipGroup options={['wheelchair','visual assistance','hearing assistance']} selected={form.accessibility_needs} onChange={v => set('accessibility_needs', v)} />
//         </div>
//         <hr className="form-divider" />
//         <button className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 14 }} disabled={!valid || isLoading} onClick={() => onSubmit(form)}>
//           {isLoading ? 'Starting…' : 'Start planning →'}
//         </button>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // FEED
// // ─────────────────────────────────────────────────────────────────────────────
// function Feed({ entries, onResume, refinementsUsed, maxRefinements, fullState }) {
//   const bottomRef = useRef(null);
//   useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [entries]);

//   if (!entries.length) {
//     return (
//       <div className="feed-wrap">
//         <div className="feed-empty">
//           <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--ink)', marginBottom: 8 }}>Plan your next trip</div>
//           <p className="feed-empty-sub">Use the form to describe where you're going. The agent will research everything and come back with a full itinerary.</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="feed-wrap">
//       <div className="feed-inner">
//         {entries.map((entry, i) => (
//           <TlEntry
//             key={entry.id}
//             entry={entry}
//             isLast={i === entries.length - 1}
//             onResume={onResume}
//             refinementsUsed={refinementsUsed}
//             maxRefinements={maxRefinements}
//             fullState={fullState}
//           />
//         ))}
//         <div ref={bottomRef} />
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // APP ROOT
// // ─────────────────────────────────────────────────────────────────────────────
// export default function App() {
//   const [sessions, setSessions]           = useState([]);
//   const [activeId, setActiveId]           = useState(null);
//   const [entries, setEntries]             = useState([]);
//   const [fullState, setFullState]         = useState(null);
//   const [showForm, setShowForm]           = useState(true);
//   const [isWorking, setIsWorking]         = useState(false);
//   const [currentLabel, setCurrentLabel]   = useState('Idle');
//   const [statusState, setStatusState]     = useState('');
//   const [refinementsUsed, setRefinementsUsed] = useState(0);
//   const [maxRefinements, setMaxRefinements]   = useState(3);

//   const esRef     = useRef(null);
//   const activeRef = useRef(null);
//   useEffect(() => { activeRef.current = activeId; }, [activeId]);

//   const loadHistory = useCallback(async () => {
//     try {
//       const data = await apiGet('/trips/history/all');
//       setSessions(data.sessions || []);
//     } catch { /* backend not up yet */ }
//   }, []);

//   useEffect(() => { loadHistory(); }, [loadHistory]);

//   const addEntry = useCallback((entry) => {
//     setEntries(prev => [...prev, { id: Date.now() + Math.random(), ...entry }]);
//   }, []);

//   const updateLastEntry = useCallback((updates) => {
//     setEntries(prev => {
//       if (!prev.length) return prev;
//       return [...prev.slice(0, -1), { ...prev[prev.length - 1], ...updates }];
//     });
//   }, []);

//   const resolveLastInterrupt = useCallback(() => {
//     setEntries(prev => {
//       if (!prev.length) return prev;
//       return [...prev.slice(0, -1), { ...prev[prev.length - 1], resolved: true }];
//     });
//   }, []);

//   // ── SSE connection ───────────────────────────────────────────────────────────
//   // connectSSE is called ONCE per session and the connection stays open.
//   // It does NOT reconnect on every resume — the backend keeps the queue alive.
//   const connectSSE = useCallback((threadId) => {
//     if (esRef.current) esRef.current.close();
//     const es = new EventSource(`${BASE_URL}/trips/${threadId}/stream`);
//     esRef.current = es;

//     es.onmessage = (e) => {
//       let event;
//       try { event = JSON.parse(e.data); } catch { return; }

//       if (event.type === 'ping') return;

//       if (event.type === 'node_start' || event.type === 'node_change') {
//         const node  = event.node;
//         const label = NODE_META[node]?.label || node;
//         setCurrentLabel(label);
//         setStatusState('working');
//         setIsWorking(true);
//         // Mark the previously running entry as done before adding the new one
//         setEntries(prev => {
//           const marked = prev.length && prev[prev.length - 1].status === 'running'
//             ? [...prev.slice(0, -1), { ...prev[prev.length - 1], status: 'done' }]
//             : prev;
//           return [...marked, { id: Date.now() + Math.random(), node, status: 'running', type: 'node_progress', label }];
//         });
//       }

//       if (event.type === 'interrupt') {
//         const node = event.node;
//         const iv   = event.interrupt_data;
//         setIsWorking(false);
//         setStatusState('working');

//         const type = classifyInterrupt(iv);

//         // Update the last running entry → now waiting with interrupt data
//         updateLastEntry({ status: 'waiting', type, interruptData: iv, resolved: false });
//         setCurrentLabel(NODE_META[node]?.label || node);
//       }

//       if (event.type === 'graph_done') {
//         const st = event.state || {};
//         setFullState(st);
//         setIsWorking(false);
//         setStatusState('done');
//         setCurrentLabel('Complete');
//         updateLastEntry({ status: 'done' });

//         if (st.itinerary) {
//           addEntry({ node: 'draft_itinerary', status: 'done', type: 'itinerary', label: 'Itinerary ready', payload: st.itinerary });
//         }
//         if (st.booking_summary) {
//           addEntry({ node: 'booking_summary', status: 'done', type: 'booking_summary', label: 'Booking summary', payload: st.booking_summary });
//         }
//         loadHistory();
//       }

//       if (event.type === 'error') {
//         setIsWorking(false);
//         setStatusState('error');
//         updateLastEntry({ status: 'error', errorMsg: event.error });
//         setCurrentLabel('Error');
//       }

//       if (event.type === 'stream_end') {
//         es.close();
//       }
//     };

//     es.onerror = () => {
//       // Transient disconnect — poll state and show what we have
//       setTimeout(async () => {
//         if (!activeRef.current) return;
//         try {
//           const st = await apiGet(`/trips/${activeRef.current}/state`);
//           setRefinementsUsed(st.refinements_used || 0);
//           setMaxRefinements(st.max_refinements || 3);
//           setFullState(st.state);
//         } catch { /* ignore */ }
//       }, 2000);
//     };
//   }, [addEntry, updateLastEntry, loadHistory]);

//   // ── Start new trip ───────────────────────────────────────────────────────────
//   const handleStart = useCallback(async (formData) => {
//     setEntries([]);
//     setFullState(null);
//     setShowForm(false);
//     setIsWorking(true);
//     setStatusState('working');
//     setCurrentLabel('Starting…');
//     setRefinementsUsed(0);

//     try {
//       const { thread_id } = await apiPost('/trips/start', formData);
//       setActiveId(thread_id);
//       connectSSE(thread_id);   // connect ONCE; stays alive for the whole session
//       loadHistory();
//     } catch (err) {
//       setIsWorking(false);
//       setStatusState('error');
//       setCurrentLabel('Error');
//       addEntry({ node: 'error', status: 'error', type: 'error', label: 'Failed to start', errorMsg: String(err) });
//     }
//   }, [connectSSE, loadHistory, addEntry]);

//   // ── Resume (interrupt response) ──────────────────────────────────────────────
//   // Just POST to /resume. The SAME SSE connection receives the new events.
//   // No reconnect needed.
//   const handleResume = useCallback(async (value) => {
//     if (!activeId) return;
//     resolveLastInterrupt();
//     setIsWorking(true);
//     setStatusState('working');
//     setCurrentLabel('Processing…');

//     try {
//       await apiPost(`/trips/${activeId}/resume`, { value });
//       // The backend _resume_graph will push node_start/node_change/interrupt/graph_done
//       // into the same queue the open SSE connection is reading from.
//     } catch (err) {
//       setStatusState('error');
//       addEntry({ node: 'error', status: 'error', type: 'error', label: 'Resume failed', errorMsg: String(err) });
//     }
//   }, [activeId, resolveLastInterrupt, addEntry]);

//   // ── Load a previous session ──────────────────────────────────────────────────
//   const handleLoadSession = useCallback(async (threadId) => {
//     setEntries([]);
//     setFullState(null);
//     setShowForm(false);
//     setActiveId(threadId);
//     setIsWorking(false);

//     try {
//       const st = await apiGet(`/trips/${threadId}/state`);
//       setRefinementsUsed(st.refinements_used || 0);
//       setMaxRefinements(st.max_refinements || 3);
//       setFullState(st.state);

//       if (st.is_done) {
//         setStatusState('done');
//         setCurrentLabel('Complete');
//         const vals = st.state || {};
//         if (vals.itinerary)      addEntry({ node: 'draft_itinerary', status: 'done', type: 'itinerary',      label: 'Itinerary',      payload: vals.itinerary });
//         if (vals.booking_summary) addEntry({ node: 'booking_summary', status: 'done', type: 'booking_summary', label: 'Booking summary', payload: vals.booking_summary });
//       } else {
//         setStatusState('working');
//         setCurrentLabel(st.current_label || 'Resuming…');
//         if (st.interrupt_data) {
//           const iv   = st.interrupt_data;
//           const type = classifyInterrupt(iv);
//           addEntry({
//             node: st.current_node || 'unknown',
//             status: 'waiting', type,
//             label: st.current_label || '',
//             interruptData: iv,
//             resolved: false,
//           });
//         }
//         connectSSE(threadId);
//       }
//     } catch (err) {
//       addEntry({ node: 'error', status: 'error', type: 'error', label: 'Could not load session', errorMsg: String(err) });
//     }
//   }, [addEntry, connectSSE]);

//   const handleNewTrip = () => {
//     esRef.current?.close();
//     setActiveId(null);
//     setEntries([]);
//     setFullState(null);
//     setShowForm(true);
//     setStatusState('');
//     setCurrentLabel('Idle');
//   };

//   const activeSession = sessions.find(s => s.thread_id === activeId);

//   return (
//     <>
//       <style>{STYLE}</style>
//       <div className="shell">
//         <Sidebar sessions={sessions} activeId={activeId} onSelect={handleLoadSession} onNew={handleNewTrip} />
//         <main className="main">
//           <div className="main-topbar">
//             <div>
//               <div className="main-topbar-title">
//                 {activeSession ? `${activeSession.source} → ${activeSession.destination}` : showForm ? 'New trip' : 'Trip planner'}
//               </div>
//               {activeId && <div className="main-topbar-sub">{activeId.slice(0, 8)}…</div>}
//             </div>
//             {statusState && (
//               <div className="status-pill">
//                 <div className={`status-dot ${statusState}`} />
//                 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentLabel}</span>
//               </div>
//             )}
//           </div>
//           {showForm
//             ? <TripForm onSubmit={handleStart} isLoading={isWorking} />
//             : <Feed entries={entries} onResume={handleResume} refinementsUsed={refinementsUsed} maxRefinements={maxRefinements} fullState={fullState} />
//           }
//         </main>
//       </div>
//     </>
//   );
// }

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --parchment:   #F7F6F3;
  --parchment-d: #EDEAE3;
  --border:      #DDD9CF;
  --ink:         #1A1A1A;
  --ink-mid:     #4A4A4A;
  --ink-muted:   #888680;
  --green:       #2D5016;
  --green-mid:   #3D6B1F;
  --green-light: #EBF2E6;
  --gold:        #8B6914;
  --gold-light:  #F5EDD4;
  --red:         #8B1A1A;
  --red-light:   #F5E8E8;
  --white:       #FFFFFF;

  --font-serif:  'DM Serif Display', Georgia, serif;
  --font-sans:   'Inter', system-ui, sans-serif;
  --font-mono:   'DM Mono', 'Courier New', monospace;

  --sidebar-w: 240px;
  --radius-sm: 4px;
  --radius:    8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow:    0 4px 12px rgba(0,0,0,0.08);
  --transition: 140ms ease;
}

html, body, #root {
  height: 100%;
  background: var(--parchment);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

.shell { display: flex; height: 100vh; overflow: hidden; }

/* ── Auth page ── */
.auth-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--parchment);
  padding: 24px;
}
.auth-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  width: 100%;
  max-width: 400px;
  padding: 40px 36px 32px;
}
.auth-logo { font-family: var(--font-serif); font-size: 28px; color: var(--ink); margin-bottom: 4px; }
.auth-logo span { color: var(--green); }
.auth-tagline { font-size: 13px; color: var(--ink-muted); margin-bottom: 28px; }
.auth-tabs { display: flex; gap: 0; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; margin-bottom: 24px; }
.auth-tab { flex: 1; padding: 8px; text-align: center; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--ink-muted); background: var(--parchment); transition: all var(--transition); border: none; font-family: var(--font-sans); }
.auth-tab.active { background: var(--white); color: var(--green); }
.auth-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
.auth-divider-line { flex: 1; height: 1px; background: var(--border); }
.auth-divider-text { font-size: 11px; color: var(--ink-muted); white-space: nowrap; }
.auth-google-btn {
  width: 100%; padding: 10px; border: 1.5px solid var(--border);
  border-radius: var(--radius-sm); background: var(--white);
  cursor: pointer; font-size: 13px; font-weight: 500;
  color: var(--ink-mid); font-family: var(--font-sans);
  display: flex; align-items: center; justify-content: center; gap: 10px;
  transition: border-color var(--transition), background var(--transition);
}
.auth-google-btn:hover { border-color: var(--green-mid); background: var(--green-light); color: var(--green); }
.auth-error { background: var(--red-light); border: 1px solid rgba(139,26,26,0.2); border-radius: var(--radius-sm); padding: 9px 12px; font-size: 12px; color: var(--red); margin-bottom: 14px; }
.auth-footer { text-align: center; font-size: 12px; color: var(--ink-muted); margin-top: 20px; }

/* ── Sidebar ── */
.sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--white);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sidebar-top { padding: 20px 16px 14px; border-bottom: 1px solid var(--border); }
.sidebar-wordmark { font-family: var(--font-serif); font-size: 20px; color: var(--ink); letter-spacing: -0.3px; line-height: 1.1; margin-bottom: 2px; }
.sidebar-wordmark span { color: var(--green); }
.sidebar-tagline { font-size: 11px; color: var(--ink-muted); letter-spacing: 0.01em; }
.sidebar-user { padding: 10px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
.sidebar-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--green-light); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: var(--green); overflow: hidden; flex-shrink: 0; }
.sidebar-avatar img { width: 100%; height: 100%; object-fit: cover; }
.sidebar-user-info { flex: 1; min-width: 0; }
.sidebar-user-name { font-size: 12px; font-weight: 500; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sidebar-user-sub { font-size: 10px; color: var(--ink-muted); }
.sidebar-logout-btn { padding: 4px 7px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 10px; color: var(--ink-muted); background: none; cursor: pointer; font-family: var(--font-sans); white-space: nowrap; transition: all var(--transition); }
.sidebar-logout-btn:hover { border-color: var(--red); color: var(--red); }
.sidebar-section-label { padding: 14px 16px 6px; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-muted); }
.sidebar-new-btn { margin: 0 12px 10px; padding: 8px 12px; background: var(--green-light); border: 1px solid rgba(45,80,22,0.2); border-radius: var(--radius-sm); color: var(--green); font-size: 12px; font-weight: 600; font-family: var(--font-sans); cursor: pointer; text-align: center; transition: background var(--transition); width: calc(100% - 24px); display: flex; align-items: center; justify-content: center; gap: 6px; }
.sidebar-new-btn:hover { background: #dcecd2; }
.session-list { flex: 1; overflow-y: auto; padding: 4px 8px 16px; display: flex; flex-direction: column; gap: 2px; }
.session-item { padding: 8px 10px; border-radius: var(--radius-sm); cursor: pointer; border: 1px solid transparent; transition: all var(--transition); position: relative; }
.session-item:hover { background: var(--parchment); border-color: var(--border); }
.session-item.active { background: var(--green-light); border-color: rgba(45,80,22,0.2); }
.session-item:hover .session-delete-btn { opacity: 1; }
.session-delete-btn {
  position: absolute; top: 6px; right: 6px;
  width: 20px; height: 20px;
  border: none; border-radius: var(--radius-sm);
  background: transparent; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: var(--ink-muted);
  opacity: 0; transition: opacity var(--transition), background var(--transition), color var(--transition);
  padding: 0;
}
.session-delete-btn:hover { background: var(--red-light); color: var(--red); opacity: 1; }
.session-delete-confirm {
  position: absolute; inset: 0; border-radius: var(--radius-sm);
  background: var(--red-light); border: 1px solid rgba(139,26,26,0.2);
  display: flex; align-items: center; justify-content: center; gap: 6px;
  z-index: 10; padding: 4px 8px;
}
.session-delete-confirm span { font-size: 11px; color: var(--red); font-weight: 500; }
.session-delete-confirm button {
  padding: 2px 8px; border-radius: 3px; border: none;
  font-size: 11px; font-family: var(--font-sans); cursor: pointer; font-weight: 500;
}
.confirm-yes { background: var(--red); color: var(--white); }
.confirm-no  { background: var(--white); color: var(--ink-mid); border: 1px solid var(--border) !important; }
.session-dest { font-size: 13px; font-weight: 500; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 22px; }
.session-item.active .session-dest { color: var(--green); }
.session-meta { font-size: 11px; color: var(--ink-muted); margin-top: 2px; display: flex; align-items: center; gap: 6px; }
.session-badge { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; padding: 1px 5px; border-radius: 10px; text-transform: uppercase; }
.session-badge.done   { background: var(--green-light); color: var(--green); }
.session-badge.active { background: var(--gold-light);  color: var(--gold);  }
.empty-sessions { padding: 12px 16px; font-size: 12px; color: var(--ink-muted); font-style: italic; }

/* ── Main ── */
.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--parchment); }
.main-topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 12px 28px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; min-height: 52px; }
.main-topbar-title { font-size: 14px; font-weight: 500; color: var(--ink); }
.main-topbar-sub { font-size: 11px; color: var(--ink-muted); margin-top: 1px; font-family: var(--font-mono); }
.status-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-family: var(--font-mono); padding: 4px 10px; border-radius: 20px; border: 1px solid var(--border); background: var(--white); color: var(--ink-muted); white-space: nowrap; max-width: 240px; overflow: hidden; text-overflow: ellipsis; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); flex-shrink: 0; }
.status-dot.working { background: var(--gold); animation: breathe 1.4s ease infinite; }
.status-dot.done    { background: #3D6B1F; }
.status-dot.error   { background: var(--red); }
@keyframes breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

/* ── Feed ── */
.feed-wrap { flex: 1; overflow-y: auto; padding: 28px 28px 40px; }
.feed-inner { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 0; }
.feed-empty { max-width: 480px; margin: 80px auto 0; text-align: center; }
.feed-empty-sub { font-size: 14px; color: var(--ink-muted); line-height: 1.6; }

/* ── Timeline ── */
.tl-entry { display: flex; align-items: flex-start; gap: 14px; position: relative; padding-bottom: 4px; }
.tl-entry:not(.tl-entry-last)::after { content: ''; position: absolute; left: 11px; top: 24px; bottom: 0; width: 1px; background: var(--border); }
.tl-entry.tl-done::after { background: var(--green); opacity: 0.35; }
.tl-dot { width: 23px; height: 23px; border-radius: 50%; flex-shrink: 0; border: 2px solid var(--border); background: var(--white); display: flex; align-items: center; justify-content: center; margin-top: 1px; position: relative; z-index: 1; transition: all var(--transition); }
.tl-dot.done    { border-color: var(--green); background: var(--green-light); }
.tl-dot.waiting { border-color: var(--gold);  background: var(--gold-light);  }
.tl-dot.running { border-color: var(--gold);  background: var(--white); }
.tl-dot.error   { border-color: var(--red);   background: var(--red-light); }
.tl-spinner { width: 10px; height: 10px; border: 1.5px solid var(--border); border-top-color: var(--gold); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.tl-check { width: 10px; height: 10px; color: var(--green); }
.tl-body { flex: 1; padding-bottom: 20px; min-width: 0; }
.tl-node-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; padding-top: 2px; }
.tl-node-name { font-family: var(--font-mono); font-size: 11px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-muted); }
.tl-node-name.done    { color: var(--green); }
.tl-node-name.waiting { color: var(--gold);  }
.tl-node-name.running { color: var(--gold);  }
.tl-node-label { font-size: 13px; color: var(--ink-mid); }
.tl-node-label.running { color: var(--ink); font-weight: 500; }

/* ── Cards ── */
.card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm); margin-top: 4px; }
.card-header { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
.card-header-left { display: flex; align-items: center; gap: 8px; }
.card-header-icon { font-size: 14px; }
.card-title { font-size: 13px; font-weight: 600; color: var(--ink); }
.card-hint  { font-size: 11px; color: var(--ink-muted); }
.card-body  { padding: 16px; }
.card.resolved { opacity: 0.5; pointer-events: none; }
.card.resolved .card-header { background: var(--parchment); }
.resolved-tag { font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-muted); background: var(--parchment-d); padding: 2px 7px; border-radius: 10px; }

/* ── Flight selection ── */
.flight-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.flight-opt { border: 1.5px solid var(--border); border-radius: var(--radius); padding: 12px 14px; cursor: pointer; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 16px; transition: border-color var(--transition), background var(--transition); }
.flight-opt:hover { border-color: var(--green-mid); background: var(--green-light); }
.flight-opt.sel   { border-color: var(--green);     background: var(--green-light); }
.flight-category { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); margin-bottom: 3px; }
.flight-airline  { font-size: 14px; font-weight: 500; color: var(--ink); }
.flight-details  { font-size: 11px; color: var(--ink-muted); font-family: var(--font-mono); margin-top: 2px; }
.flight-price    { text-align: right; }
.flight-price-amt { font-size: 18px; font-weight: 600; color: var(--ink); font-family: var(--font-serif); }
.flight-price-sub { font-size: 10px; color: var(--ink-muted); margin-top: 1px; }

/* ── Review ── */
.review-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
.review-opt { padding: 10px 14px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); text-align: center; cursor: pointer; font-size: 13px; color: var(--ink-mid); background: var(--parchment); transition: all var(--transition); font-family: var(--font-sans); }
.review-opt:hover { border-color: var(--green-mid); }
.review-opt.sel-yes { border-color: var(--gold);  background: var(--gold-light);  color: var(--gold); }
.review-opt.sel-no  { border-color: var(--green); background: var(--green-light); color: var(--green); }
.refinements-left { font-size: 11px; color: var(--ink-muted); margin-bottom: 10px; font-family: var(--font-mono); }

/* ── Fields ── */
.field { margin-bottom: 12px; }
.field label { display: block; font-size: 11px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 5px; }
.field input, .field textarea, .field select { width: 100%; padding: 8px 11px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); background: var(--parchment); color: var(--ink); font-family: var(--font-sans); font-size: 13px; outline: none; transition: border-color var(--transition); }
.field input:focus, .field textarea:focus, .field select:focus { border-color: var(--green-mid); background: var(--white); }
.field input::placeholder, .field textarea::placeholder { color: var(--ink-muted); }
.field textarea { resize: vertical; min-height: 72px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.checkbox-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.checkbox-row input[type=checkbox] { width: 15px; height: 15px; accent-color: var(--green); }
.checkbox-row label { font-size: 13px; color: var(--ink-mid); cursor: pointer; }

/* ── Buttons ── */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: none; border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: 13px; font-weight: 500; cursor: pointer; transition: all var(--transition); padding: 9px 18px; white-space: nowrap; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary  { background: var(--green); color: var(--white); }
.btn-primary:hover:not(:disabled) { background: var(--green-mid); }
.btn-ghost    { background: transparent; color: var(--ink-mid); border: 1.5px solid var(--border); }
.btn-ghost:hover:not(:disabled)   { border-color: var(--green-mid); color: var(--green); }
.btn-gold     { background: var(--gold); color: var(--white); }
.btn-gold:hover:not(:disabled)    { background: #7a5c10; }
.btn-row { display: flex; gap: 8px; flex-wrap: wrap; }

/* ── Itinerary ── */
.itin-dest { font-family: var(--font-serif); font-size: 26px; color: var(--ink); letter-spacing: -0.5px; margin-bottom: 3px; }
.itin-meta { font-size: 12px; color: var(--ink-muted); font-family: var(--font-mono); margin-bottom: 20px; }
.itin-section { margin-bottom: 22px; }
.itin-section-head { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-muted); border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 12px; }
.hotel-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.hotel-name { font-size: 15px; font-weight: 600; color: var(--ink); }
.hotel-loc  { font-size: 12px; color: var(--ink-muted); margin-top: 2px; }
.hotel-rating { font-size: 12px; color: var(--gold); margin-top: 2px; }
.hotel-links { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
.hotel-link-btn { font-size: 11px; color: var(--green); text-decoration: underline; cursor: pointer; background: none; border: none; font-family: var(--font-sans); padding: 0; }
.flight-legs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.flight-leg { background: var(--parchment); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; }
.leg-dir     { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 4px; }
.leg-airline { font-size: 13px; font-weight: 500; color: var(--ink); }
.leg-times   { font-family: var(--font-mono); font-size: 11px; color: var(--ink-mid); margin-top: 3px; }
.leg-price   { font-size: 13px; color: var(--gold); font-weight: 600; margin-top: 4px; font-family: var(--font-mono); }
.day-card { border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 8px; overflow: hidden; }
.day-card-head { display: flex; align-items: center; justify-content: space-between; padding: 9px 14px; background: var(--parchment-d); cursor: pointer; user-select: none; }
.day-card-title   { font-size: 13px; font-weight: 600; color: var(--ink); }
.day-card-weather { font-size: 11px; color: var(--ink-muted); font-family: var(--font-mono); }
.day-card-caret   { font-size: 10px; color: var(--ink-muted); }
.day-card-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.activity { display: grid; grid-template-columns: 80px 1fr; gap: 12px; align-items: flex-start; }
.activity-time  { font-family: var(--font-mono); font-size: 11px; color: var(--gold); padding-top: 2px; white-space: nowrap; }
.activity-title { font-size: 13px; font-weight: 500; color: var(--ink); }
.activity-loc   { font-size: 11px; color: var(--ink-muted); margin-top: 1px; }
.activity-cost  { font-size: 11px; color: var(--ink-mid); margin-top: 2px; font-family: var(--font-mono); }
.activity-notes { font-size: 11px; color: var(--ink-muted); margin-top: 2px; font-style: italic; }
.tips-list { list-style: none; display: flex; flex-direction: column; gap: 5px; }
.tips-list li { font-size: 12px; color: var(--ink-mid); padding-left: 16px; position: relative; }
.tips-list li::before { content: '—'; position: absolute; left: 0; color: var(--gold); }

/* ── Booking summary ── */
.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.summary-cell { background: var(--parchment); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; }
.summary-cell-head  { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 5px; }
.summary-cell-name  { font-size: 14px; font-weight: 600; color: var(--ink); }
.summary-cell-sub   { font-size: 11px; color: var(--ink-muted); margin-top: 2px; }
.summary-cell-price { font-size: 20px; font-family: var(--font-serif); color: var(--green); margin-top: 5px; }
.summary-total { background: var(--green-light); border: 1px solid rgba(45,80,22,0.2); border-radius: var(--radius-sm); padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.summary-total-label  { font-size: 13px; font-weight: 500; color: var(--ink-mid); }
.summary-total-amount { font-size: 28px; font-family: var(--font-serif); color: var(--green); line-height: 1; }
.checkout-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
.checkout-link { display: block; padding: 11px 14px; border-radius: var(--radius-sm); text-align: center; font-size: 13px; font-weight: 600; text-decoration: none; transition: opacity var(--transition); }
.checkout-link:hover { opacity: 0.85; text-decoration: none; }
.checkout-flight { background: var(--ink);   color: var(--white); }
.checkout-hotel  { background: var(--green); color: var(--white); }
.avail-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.avail-tag  { display: flex; align-items: center; gap: 5px; font-size: 11px; padding: 5px 10px; border-radius: var(--radius-sm); }
.avail-ok   { background: var(--green-light); color: var(--green); border: 1px solid rgba(45,80,22,0.15); }
.avail-warn { background: var(--red-light);   color: var(--red);   border: 1px solid rgba(139,26,26,0.15); }

/* ── Form ── */
.form-wrap  { flex: 1; overflow-y: auto; padding: 32px 28px 48px; }
.form-inner { max-width: 600px; margin: 0 auto; }
.form-heading { font-family: var(--font-serif); font-size: 30px; color: var(--ink); letter-spacing: -0.5px; margin-bottom: 4px; line-height: 1.15; }
.form-sub     { font-size: 14px; color: var(--ink-muted); margin-bottom: 28px; }
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.chip { padding: 4px 11px; border: 1.5px solid var(--border); border-radius: 20px; font-size: 12px; color: var(--ink-muted); background: var(--white); cursor: pointer; transition: all var(--transition); user-select: none; font-family: var(--font-sans); }
.chip:hover { border-color: var(--green-mid); color: var(--green); }
.chip.on    { border-color: var(--green); color: var(--green); background: var(--green-light); }
.form-divider { border: none; border-top: 1px solid var(--border); margin: 20px 0; }
.error-msg { background: var(--red-light); border: 1px solid rgba(139,26,26,0.2); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 12px; color: var(--red); margin-bottom: 14px; }

/* ── Skeleton ── */
.skeleton { animation: shimmer 1.4s ease infinite; }
@keyframes shimmer { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
.skeleton-line { height: 11px; background: var(--border); border-radius: 4px; margin-bottom: 6px; }
.working-node { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; margin-top: 4px; }
`;

// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:8000';

const NODE_META = {
  get_weather:             { label: 'Weather forecast',        emoji: '🌤' },
  get_attractions:         { label: 'Discovering attractions', emoji: '🗺' },
  attraction_ranking_node: { label: 'Ranking attractions',     emoji: '⭐' },
  get_hotels:              { label: 'Searching hotels',        emoji: '🏨' },
  hotel_ranking_node:      { label: 'Selecting best hotel',    emoji: '🏆' },
  flight_discovery:        { label: 'Searching flights',       emoji: '✈' },
  flight_selection:        { label: 'Choose a flight',         emoji: '🎫' },
  manual_flight_input:     { label: 'Enter flight details',    emoji: '✍' },
  draft_itinerary:         { label: 'Drafting itinerary',      emoji: '📝' },
  review_decision:         { label: 'Review itinerary',        emoji: '◎' },
  collect_feedback:        { label: 'Your feedback',           emoji: '✏' },
  refine_node:             { label: 'Refining itinerary',      emoji: '🔁' },
  booking_verification:    { label: 'Verifying availability',  emoji: '🔍' },
  timeline_repair:         { label: 'Adjusting timeline',      emoji: '🔧' },
  checkout_link_generator: { label: 'Generating links',        emoji: '🔗' },
  booking_summary:         { label: 'Booking summary',         emoji: '🎟' },
};

const INTERESTS     = ['beaches','nightlife','shopping','museums','hiking','historical sites','local food'];
const DIETARY       = ['vegetarian','vegan','jain','halal','gluten-free'];
const TRAVEL_STYLES = ['budget','balanced','luxury','family','adventure','romantic'];

const fmt = (n) => n > 0 ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

// ─────────────────────────────────────────────────────────────────────────────
// JWT token storage
// ─────────────────────────────────────────────────────────────────────────────
const TOKEN_KEY = 'wayfind_token';
const USER_KEY  = 'wayfind_user';

function saveAuth(token, user) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}
function clearAuth() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}
function getToken()    { return sessionStorage.getItem(TOKEN_KEY); }
function getSavedUser() {
  try { return JSON.parse(sessionStorage.getItem(USER_KEY)); } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// API helpers — all auto-attach Authorization header
// ─────────────────────────────────────────────────────────────────────────────
async function apiPost(path, body, token) {
  const t = token || getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error('__UNAUTHORIZED__');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiGet(path) {
  const t = getToken();
  const headers = {};
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (res.status === 401) throw new Error('__UNAUTHORIZED__');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiDelete(path) {
  const t = getToken();
  const headers = {};
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers });
  if (res.status === 401) throw new Error('__UNAUTHORIZED__');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// SSE with auth token in URL query param (EventSource doesn't support headers)
function openSSE(threadId) {
  const token = getToken();
  const url = `${BASE_URL}/trips/${threadId}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  return new EventSource(url);
}

function classifyInterrupt(iv) {
  if (!iv) return 'unknown';
  if (typeof iv === 'string') return 'review_decision';
  if (iv.type === 'review_decision')   return 'review_decision';
  if (iv.type === 'flight_selection')  return 'flight_selection';
  if (iv.type === 'manual_flight_input') return 'manual_flight_input';
  if (iv.type === 'collect_feedback')  return 'collect_feedback';
  return 'unknown';
}

// Convert a persisted DB node row → frontend entry shape
function dbNodeToEntry(row) {
  return {
    id:            `db_${row.id || row.seq}`,
    node:          row.node,
    status:        row.status,
    type:          row.type || 'node_progress',
    label:         row.label || row.node,
    interruptData: row.interrupt_data || null,
    payload:       row.payload || null,
    errorMsg:      row.error_msg || null,
    resolved:      !!row.resolved,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG icons
// ─────────────────────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg className="tl-check" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2,6 5,9 10,3" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTH PAGE
// ─────────────────────────────────────────────────────────────────────────────
function AuthPage({ onAuth, initialError = '' }) {
  const [tab, setTab]           = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDN]    = useState('');
  const [error, setError]       = useState(initialError);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!username.trim() || !password.trim()) { setError('Username and password required.'); return; }
    setLoading(true);
    try {
      const path = tab === 'login' ? '/auth/login' : '/auth/register';
      const body = tab === 'login'
        ? { username: username.trim(), password }
        : { username: username.trim(), password, display_name: displayName.trim() || username.trim() };
      const data = await apiPost(path, body, '');   // no token yet
      saveAuth(data.access_token, {
        user_id: data.user_id, username: data.username,
        display_name: data.display_name, avatar_url: data.avatar_url,
      });
      onAuth(data);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already taken')) setError('Username is already taken.');
      else if (msg.includes('Incorrect'))  setError('Incorrect username or password.');
      else setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const data = await apiGet('/auth/google');
      window.location.href = data.url;
    } catch {
      setError('Google login is not configured on this server.');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">wayfind<span>.</span></div>
        <div className="auth-tagline">AI-powered trip planning</div>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>
            Sign in
          </button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); }}>
            Create account
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {tab === 'register' && (
          <div className="field">
            <label>Display name</label>
            <input value={displayName} onChange={e => setDN(e.target.value)} placeholder="Your name" />
          </div>
        )}
        <div className="field">
          <label>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)}
            placeholder="username" autoComplete="username"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginBottom: 4 }}
          disabled={loading} onClick={handleSubmit}>
          {loading ? 'Please wait…' : tab === 'login' ? 'Sign in →' : 'Create account →'}
        </button>

        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">or continue with</span>
          <div className="auth-divider-line" />
        </div>

        <button className="auth-google-btn" onClick={handleGoogle}>
          <GoogleIcon /> Google
        </button>

        <div className="auth-footer">
          {tab === 'login'
            ? <>No account? <span style={{ color: 'var(--green)', cursor: 'pointer' }} onClick={() => setTab('register')}>Sign up free</span></>
            : <>Already have an account? <span style={{ color: 'var(--green)', cursor: 'pointer' }} onClick={() => setTab('login')}>Sign in</span></>
          }
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR with delete
// ─────────────────────────────────────────────────────────────────────────────
function Sidebar({ sessions, activeId, onSelect, onNew, onDelete, user, onLogout }) {
  const [confirmId, setConfirmId] = useState(null);

  const handleDelete = (e, threadId) => {
    e.stopPropagation();
    setConfirmId(threadId);
  };

  const handleConfirmYes = (e, threadId) => {
    e.stopPropagation();
    setConfirmId(null);
    onDelete(threadId);
  };

  const handleConfirmNo = (e) => {
    e.stopPropagation();
    setConfirmId(null);
  };

  const initials = (user?.display_name || user?.username || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-wordmark">wayfind<span>.</span></div>
        <div className="sidebar-tagline">AI trip planning</div>
      </div>

      {user && (
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user.avatar_url
              ? <img src={user.avatar_url} alt={initials} />
              : initials}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.display_name || user.username}</div>
            <div className="sidebar-user-sub">@{user.username || 'user'}</div>
          </div>
          <button className="sidebar-logout-btn" onClick={onLogout}>Sign out</button>
        </div>
      )}

      <div className="sidebar-section-label">Trips</div>
      <button className="sidebar-new-btn" onClick={onNew}><span>+</span> New trip</button>

      <div className="session-list">
        {sessions.length === 0 && <div className="empty-sessions">No trips yet.</div>}
        {sessions.map((s) => (
          <div
            key={s.thread_id}
            className={`session-item ${activeId === s.thread_id ? 'active' : ''}`}
            onClick={() => confirmId !== s.thread_id && onSelect(s.thread_id)}
          >
            {confirmId === s.thread_id ? (
              <div className="session-delete-confirm" onClick={e => e.stopPropagation()}>
                <span>Delete trip?</span>
                <button className="confirm-yes" onClick={(e) => handleConfirmYes(e, s.thread_id)}>Delete</button>
                <button className="confirm-no"  onClick={handleConfirmNo}>Cancel</button>
              </div>
            ) : (
              <>
                <div className="session-dest">{s.destination || 'Unknown'}</div>
                <div className="session-meta">
                  <span>{s.source || '—'}</span>
                  <span className={`session-badge ${s.is_done ? 'done' : 'active'}`}>
                    {s.is_done ? 'Done' : 'Active'}
                  </span>
                </div>
                <button
                  className="session-delete-btn"
                  title="Delete this trip"
                  onClick={(e) => handleDelete(e, s.thread_id)}
                >✕</button>
              </>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline dot
// ─────────────────────────────────────────────────────────────────────────────
function TlDot({ status }) {
  return (
    <div className={`tl-dot ${status}`}>
      {status === 'done'    && <CheckIcon />}
      {status === 'running' && <div className="tl-spinner" />}
      {status === 'waiting' && <span style={{ fontSize: 8, color: 'var(--gold)' }}>●</span>}
      {status === 'error'   && <span style={{ fontSize: 9, color: 'var(--red)' }}>✕</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FLIGHT SELECTION CARD
// ─────────────────────────────────────────────────────────────────────────────
function FlightCard({ entry, onResume }) {
  const [sel, setSel] = useState(null);
  const opts = entry.interruptData?.options || [];

  if (entry.resolved) {
    return (
      <div className="card resolved">
        <div className="card-header">
          <div className="card-header-left"><span className="card-header-icon">✈</span><span className="card-title">Flight selected</span></div>
          <span className="resolved-tag">resolved</span>
        </div>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-left"><span className="card-header-icon">✈</span><span className="card-title">Choose your flight</span></div>
        <span className="card-hint">{opts.length} option{opts.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="card-body">
        <div className="flight-grid">
          {opts.map((opt) => (
            <div key={opt.id} className={`flight-opt ${sel === opt.id ? 'sel' : ''}`} onClick={() => setSel(opt.id)}>
              <div>
                <div className="flight-category">{opt.category?.replace('_', ' ')}</div>
                <div className="flight-airline">{opt.airline}</div>
                <div className="flight-details">
                  {opt.departure} → {opt.arrival} &nbsp;·&nbsp; {opt.duration} &nbsp;·&nbsp;
                  {opt.stops === 0 ? 'Non-stop' : `${opt.stops} stop`}
                </div>
              </div>
              <div className="flight-price">
                <div className="flight-price-amt">{opt.price > 0 ? fmt(opt.price) : '—'}</div>
                <div className="flight-price-sub">round trip</div>
              </div>
            </div>
          ))}
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" disabled={!sel} onClick={() => sel && onResume({ selected_option: sel })}>
            Confirm selection →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL FLIGHT CARD
// ─────────────────────────────────────────────────────────────────────────────
function ManualFlightCard({ entry, onResume }) {
  const [airline, setAirline] = useState('');
  const [budget, setBudget]   = useState('');
  const [direct, setDirect]   = useState(false);

  if (entry.resolved) {
    return (
      <div className="card resolved">
        <div className="card-header">
          <div className="card-header-left"><span className="card-header-icon">✍</span><span className="card-title">Flight preferences submitted</span></div>
          <span className="resolved-tag">resolved</span>
        </div>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-left"><span className="card-header-icon">✍</span><span className="card-title">Enter flight preferences</span></div>
        <span className="card-hint">manual entry</span>
      </div>
      <div className="card-body">
        <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 14 }}>
          Couldn't retrieve live flights. Enter your preferences and we'll plan around them.
        </p>
        <div className="field">
          <label>Preferred airline</label>
          <input value={airline} onChange={e => setAirline(e.target.value)} placeholder="e.g. IndiGo, Air India" />
        </div>
        <div className="field-row" style={{ marginBottom: 12 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Max budget (₹)</label>
            <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="12000" />
          </div>
        </div>
        <div className="checkbox-row">
          <input type="checkbox" id="direct" checked={direct} onChange={e => setDirect(e.target.checked)} />
          <label htmlFor="direct">Direct flights only</label>
        </div>
        <button className="btn btn-primary" onClick={() => onResume({ preferred_airline: airline, budget: Number(budget), direct_only: direct })}>
          Submit
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW CARD
// ─────────────────────────────────────────────────────────────────────────────
function ReviewCard({ entry, onResume, refinementsUsed, maxRefinements }) {
  const [choice, setChoice] = useState('no');
  const remaining = maxRefinements - refinementsUsed;
  const itin = entry.interruptData?.itinerary || null;

  if (entry.resolved) {
    return (
      <div className="card resolved">
        <div className="card-header">
          <div className="card-header-left"><span className="card-header-icon">◎</span><span className="card-title">Review submitted</span></div>
          <span className="resolved-tag">resolved</span>
        </div>
      </div>
    );
  }
  return (
    <>
      {itin && <ItineraryCard itin={itin} />}
      <div className="card" style={{ marginTop: 10 }}>
        <div className="card-header">
          <div className="card-header-left"><span className="card-header-icon">◎</span><span className="card-title">Does this itinerary look right?</span></div>
          <span className="card-hint">{remaining} revision{remaining !== 1 ? 's' : ''} left</span>
        </div>
        <div className="card-body">
          <p className="refinements-left">
            {refinementsUsed > 0 && `${refinementsUsed} revision${refinementsUsed !== 1 ? 's' : ''} used · `}
            {remaining} remaining
          </p>
          <div className="review-toggle">
            <div className={`review-opt ${choice === 'no' ? 'sel-no' : ''}`} onClick={() => setChoice('no')}>
              Looks good
            </div>
            <div
              className={`review-opt ${choice === 'yes' ? 'sel-yes' : ''}`}
              onClick={() => remaining > 0 && setChoice('yes')}
              style={{ opacity: remaining === 0 ? 0.4 : 1, cursor: remaining === 0 ? 'not-allowed' : 'pointer' }}
            >
              Request changes
            </div>
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => onResume(choice)}>
              {choice === 'no' ? 'Approve & continue →' : 'Continue to feedback'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK CARD
// ─────────────────────────────────────────────────────────────────────────────
function FeedbackCard({ entry, onResume }) {
  const [text, setText] = useState('');
  if (entry.resolved) {
    return (
      <div className="card resolved">
        <div className="card-header">
          <div className="card-header-left"><span className="card-header-icon">✏</span><span className="card-title">Feedback submitted</span></div>
          <span className="resolved-tag">resolved</span>
        </div>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-left"><span className="card-header-icon">✏</span><span className="card-title">What would you like changed?</span></div>
      </div>
      <div className="card-body">
        <div className="field">
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="e.g. More beach time on Day 2, add a sunset cruise, fewer museums…" />
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" disabled={!text.trim()} onClick={() => onResume(text.trim())}>
            Submit feedback
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DAY CARD + ITINERARY CARD + BOOKING SUMMARY CARD  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function DayCard({ day }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="day-card">
      <div className="day-card-head" onClick={() => setOpen(o => !o)}>
        <div>
          <div className="day-card-title">Day {day.day_number} · {day.date}</div>
          <div className="day-card-weather">{day.weather_summary}</div>
        </div>
        <span className="day-card-caret">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="day-card-body">
          {(day.activities || []).map((act, i) => (
            <div key={i} className="activity">
              <div className="activity-time">{act.time_slot}</div>
              <div>
                <div className="activity-title">{act.title}</div>
                <div className="activity-loc">{act.location}</div>
                {act.estimated_cost > 0 && <div className="activity-cost">{fmt(act.estimated_cost)}</div>}
                {act.notes && <div className="activity-notes">{act.notes}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ItineraryCard({ itin }) {
  if (!itin) return null;
  const out = itin.selected_flight?.outbound_flight;
  const ret = itin.selected_flight?.return_flight;
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-left"><span className="card-header-icon">📋</span><span className="card-title">Your itinerary</span></div>
        {itin.total_estimated_cost > 0 && <span className="card-hint">~{fmt(itin.total_estimated_cost)}</span>}
      </div>
      <div className="card-body">
        <div className="itin-dest">{itin.destination}</div>
        {itin.hotel && (
          <div className="itin-section">
            <div className="itin-section-head">Hotel</div>
            <div className="hotel-row">
              <div>
                <div className="hotel-name">{itin.hotel.name}</div>
                <div className="hotel-loc">{itin.hotel.location}</div>
                {itin.hotel.rating > 0 && <div className="hotel-rating">{'★'.repeat(Math.round(itin.hotel.rating * 5))} {itin.hotel.rating.toFixed(2)}</div>}
                {itin.hotel.price_per_night > 0 && <div className="hotel-loc" style={{ marginTop: 3 }}>{fmt(itin.hotel.price_per_night)}/night</div>}
              </div>
              {itin.hotel.booking_platforms?.length > 0 && (
                <div className="hotel-links">
                  {itin.hotel.booking_platforms.slice(0, 3).map((p, i) => (
                    <a key={i} href={p.url} target="_blank" rel="noreferrer" className="hotel-link-btn">{p.platform} ↗</a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {out && (
          <div className="itin-section">
            <div className="itin-section-head">Flights</div>
            <div className="flight-legs">
              {[['Outbound', out], ['Return', ret]].map(([dir, leg]) => leg ? (
                <div key={dir} className="flight-leg">
                  <div className="leg-dir">{dir}</div>
                  <div className="leg-airline">{leg.airline}</div>
                  <div className="leg-times">{leg.source} → {leg.destination}<br />{leg.departure_time} → {leg.arrival_time} · {leg.duration}</div>
                  {leg.price > 0 && <div className="leg-price">{fmt(leg.price)}</div>}
                </div>
              ) : null)}
            </div>
          </div>
        )}
        {itin.daily_plans?.length > 0 && (
          <div className="itin-section">
            <div className="itin-section-head">Day by day</div>
            {itin.daily_plans.map(day => <DayCard key={day.day_number} day={day} />)}
          </div>
        )}
        {itin.travel_tips?.length > 0 && (
          <div className="itin-section">
            <div className="itin-section-head">Travel tips</div>
            <ul className="tips-list">{itin.travel_tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}

function BookingSummaryCard({ summary, verification }) {
  if (!summary) return null;
  const fv = verification?.flight;
  const hv = verification?.hotel;
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-left"><span className="card-header-icon">🎟</span><span className="card-title">Ready to book</span></div>
        <span className="card-hint">final summary</span>
      </div>
      <div className="card-body">
        {(fv || hv) && (
          <div className="avail-row">
            <div className={`avail-tag ${fv?.is_available !== false ? 'avail-ok' : 'avail-warn'}`}>{fv?.is_available !== false ? '✓' : '!'} Flight confirmed</div>
            <div className={`avail-tag ${hv?.is_available !== false ? 'avail-ok' : 'avail-warn'}`}>{hv?.is_available !== false ? '✓' : '!'} Hotel confirmed</div>
          </div>
        )}
        <div className="summary-grid">
          <div className="summary-cell">
            <div className="summary-cell-head">Flight</div>
            <div className="summary-cell-name">{summary.flight_airline}{summary.flight_number ? ` ${summary.flight_number}` : ''}</div>
            {summary.flight_price_per_person > 0 && <div className="summary-cell-sub">{fmt(summary.flight_price_per_person)} × {summary.num_people} × 2 legs</div>}
            {summary.flight_total_price > 0 && <div className="summary-cell-price">{fmt(summary.flight_total_price)}</div>}
          </div>
          <div className="summary-cell">
            <div className="summary-cell-head">Hotel</div>
            <div className="summary-cell-name">{summary.hotel_name}</div>
            <div className="summary-cell-sub">{summary.hotel_room_type}</div>
            {summary.hotel_price_per_night > 0 && <div className="summary-cell-sub">{fmt(summary.hotel_price_per_night)}/night × {summary.hotel_nights} nights</div>}
            {summary.hotel_total_price > 0 && <div className="summary-cell-price">{fmt(summary.hotel_total_price)}</div>}
          </div>
        </div>
        {summary.grand_total > 0 && (
          <div className="summary-total">
            <span className="summary-total-label">Total estimated cost</span>
            <span className="summary-total-amount">{fmt(summary.grand_total)}</span>
          </div>
        )}
        <div className="checkout-row">
          <a href={summary.flight_checkout_url} target="_blank" rel="noreferrer" className="checkout-link checkout-flight">Book flight →</a>
          <a href={summary.hotel_checkout_url}  target="_blank" rel="noreferrer" className="checkout-link checkout-hotel">Book hotel →</a>
        </div>
        <p style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
          Each link opens the booking platform directly. Review the details and complete payment there.
        </p>
      </div>
    </div>
  );
}

function WorkingSkeleton({ label }) {
  return (
    <div className="working-node skeleton">
      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', marginBottom: 8 }}>{label || 'Working…'}</div>
      <div className="skeleton-line" style={{ width: '60%' }} />
      <div className="skeleton-line" style={{ width: '40%' }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE ENTRY
// ─────────────────────────────────────────────────────────────────────────────
function TlEntry({ entry, isLast, onResume, refinementsUsed, maxRefinements, fullState }) {
  const meta   = NODE_META[entry.node] || { label: entry.node, emoji: '·' };
  const status = entry.status;

  return (
    <div className={`tl-entry tl-${status} ${isLast ? 'tl-entry-last' : ''}`}>
      <TlDot status={status} />
      <div className="tl-body">
        <div className="tl-node-row">
          <span className={`tl-node-name ${status}`}>{meta.emoji} {entry.node}</span>
          <span className={`tl-node-label ${status}`}>{meta.label}</span>
        </div>

        {status === 'running' && !entry.interruptData && (
          <WorkingSkeleton label={`${meta.label}…`} />
        )}

        {entry.interruptData && entry.type === 'flight_selection' && (
          <FlightCard entry={entry} onResume={onResume} />
        )}
        {entry.interruptData && entry.type === 'manual_flight_input' && (
          <ManualFlightCard entry={entry} onResume={onResume} />
        )}
        {entry.interruptData && entry.type === 'review_decision' && (
          <ReviewCard entry={entry} onResume={onResume}
            refinementsUsed={refinementsUsed} maxRefinements={maxRefinements} />
        )}
        {entry.interruptData && entry.type === 'collect_feedback' && (
          <FeedbackCard entry={entry} onResume={onResume} />
        )}
        {entry.type === 'itinerary' && entry.payload && (
          <ItineraryCard itin={entry.payload} />
        )}
        {entry.type === 'booking_summary' && entry.payload && (
          <BookingSummaryCard summary={entry.payload} verification={fullState?.booking_verification} />
        )}
        {status === 'error' && (
          <div className="error-msg" style={{ marginTop: 6 }}>
            {entry.errorMsg || 'An unexpected error occurred.'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function ChipGroup({ options, selected, onChange }) {
  const toggle = (opt) =>
    onChange(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]);
  return (
    <div className="chip-row">
      {options.map(opt => (
        <span key={opt} className={`chip ${selected.includes(opt) ? 'on' : ''}`} onClick={() => toggle(opt)}>
          {opt}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIP FORM
// ─────────────────────────────────────────────────────────────────────────────
function TripForm({ onSubmit, isLoading }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    source: 'Delhi', destination: 'Goa',
    start_date: '', end_date: '',
    num_people: 2, budget: 50000,
    travel_style: 'balanced', flexibility_tolerance: 'medium',
    interests: [], dietary_restrictions: [], accessibility_needs: [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.source && form.destination && form.start_date && form.end_date;

  return (
    <div className="form-wrap">
      <div className="form-inner">
        <h1 className="form-heading">Where are you going?</h1>
        <p className="form-sub">Tell the agent your trip details. It will research flights, hotels, and attractions — then draft a full itinerary for you to review.</p>

        <div className="field-row" style={{ marginBottom: 12 }}>
          <div className="field" style={{ marginBottom: 0 }}><label>From</label><input value={form.source} onChange={e => set('source', e.target.value)} placeholder="Delhi" /></div>
          <div className="field" style={{ marginBottom: 0 }}><label>To</label><input value={form.destination} onChange={e => set('destination', e.target.value)} placeholder="Goa" /></div>
        </div>
        <div className="field-row" style={{ marginBottom: 12 }}>
          <div className="field" style={{ marginBottom: 0 }}><label>Departure</label><input type="date" min={today} value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
          <div className="field" style={{ marginBottom: 0 }}><label>Return</label><input type="date" min={form.start_date || today} value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div>
        </div>
        <div className="field-row" style={{ marginBottom: 12 }}>
          <div className="field" style={{ marginBottom: 0 }}><label>Travellers</label><input type="number" min={1} max={20} value={form.num_people} onChange={e => set('num_people', +e.target.value)} /></div>
          <div className="field" style={{ marginBottom: 0 }}><label>Budget (₹)</label><input type="number" min={0} step={1000} value={form.budget} onChange={e => set('budget', +e.target.value)} /></div>
        </div>
        <div className="field-row" style={{ marginBottom: 12 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Travel style</label>
            <select value={form.travel_style} onChange={e => set('travel_style', e.target.value)}>
              {TRAVEL_STYLES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Flexibility</label>
            <select value={form.flexibility_tolerance} onChange={e => set('flexibility_tolerance', e.target.value)}>
              <option>low</option><option>medium</option><option>high</option>
            </select>
          </div>
        </div>
        <div className="field"><label>Interests</label><ChipGroup options={INTERESTS} selected={form.interests} onChange={v => set('interests', v)} /></div>
        <div className="field"><label>Dietary</label><ChipGroup options={DIETARY} selected={form.dietary_restrictions} onChange={v => set('dietary_restrictions', v)} /></div>
        <div className="field">
          <label>Accessibility needs</label>
          <ChipGroup options={['wheelchair','visual assistance','hearing assistance']} selected={form.accessibility_needs} onChange={v => set('accessibility_needs', v)} />
        </div>
        <hr className="form-divider" />
        <button className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 14 }}
          disabled={!valid || isLoading} onClick={() => onSubmit(form)}>
          {isLoading ? 'Starting…' : 'Start planning →'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEED
// ─────────────────────────────────────────────────────────────────────────────
function Feed({ entries, onResume, refinementsUsed, maxRefinements, fullState }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [entries]);

  if (!entries.length) {
    return (
      <div className="feed-wrap">
        <div className="feed-empty">
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--ink)', marginBottom: 8 }}>Plan your next trip</div>
          <p className="feed-empty-sub">Use the form to describe where you're going. The agent will research everything and come back with a full itinerary.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-wrap">
      <div className="feed-inner">
        {entries.map((entry, i) => (
          <TlEntry
            key={entry.id}
            entry={entry}
            isLast={i === entries.length - 1}
            onResume={onResume}
            refinementsUsed={refinementsUsed}
            maxRefinements={maxRefinements}
            fullState={fullState}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // ── Auth state ──────────────────────────────────────────────────────────────
  const [authUser, setAuthUser]       = useState(() => getSavedUser());
  const [googleAuthError, setGoogleAuthError] = useState('');

  // ── Pick up Google OAuth token from URL on mount ─────────────────────────────
  // After Google redirects to http://localhost:5173/?token=...  React reads the
  // params here, saves auth, then cleans the URL so the token never stays in
  // browser history.  A second browser request (the 400 you saw) cannot happen
  // because we remove ?code from the URL before any retry.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const urlToken = params.get('token');
    if (urlToken) {
      const user = {
        user_id:      params.get('user_id')      || '',
        username:     params.get('username')     || '',
        display_name: params.get('display_name') || params.get('username') || 'Traveller',
        avatar_url:   params.get('avatar_url')   || null,
      };
      saveAuth(urlToken, user);
      setAuthUser(user);
      // Remove all query params — prevents token leaking in browser history
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    const authErr = params.get('auth_error');
    if (authErr) {
      const MSG = {
        google_not_configured:  'Google login is not configured on this server.',
        google_token_failed:    'Google sign-in failed — the code may have expired. Please try again.',
        google_userinfo_failed: 'Could not fetch your Google profile. Please try again.',
      };
      setGoogleAuthError(MSG[authErr] || 'Google sign-in failed. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Trip state ──────────────────────────────────────────────────────────────
  const [sessions, setSessions]           = useState([]);
  const [activeId, setActiveId]           = useState(null);
  const [entries, setEntries]             = useState([]);
  const [fullState, setFullState]         = useState(null);
  const [showForm, setShowForm]           = useState(true);
  const [isWorking, setIsWorking]         = useState(false);
  const [currentLabel, setCurrentLabel]   = useState('Idle');
  const [statusState, setStatusState]     = useState('');
  const [refinementsUsed, setRefinementsUsed] = useState(0);
  const [maxRefinements, setMaxRefinements]   = useState(3);

  // ── KEY: per-session entry cache so switching tabs restores the full history ─
  // sessionCache ref: { [threadId]: { entries, fullState, refinementsUsed, maxRefinements, statusState, currentLabel } }
  const sessionCache = useRef({});

  const esRef     = useRef(null);
  const activeRef = useRef(null);
  useEffect(() => { activeRef.current = activeId; }, [activeId]);

  // ── Save current session entries to cache whenever they change ──────────────
  useEffect(() => {
    if (!activeId) return;
    sessionCache.current[activeId] = {
      entries, fullState, refinementsUsed, maxRefinements, statusState, currentLabel,
    };
  }, [activeId, entries, fullState, refinementsUsed, maxRefinements, statusState, currentLabel]);

  const handleUnauthorized = useCallback(() => {
    clearAuth();
    setAuthUser(null);
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await apiGet('/trips/history/all');
      setSessions(data.sessions || []);
    } catch (err) {
      if (err.message === '__UNAUTHORIZED__') handleUnauthorized();
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    if (authUser) loadHistory();
  }, [authUser, loadHistory]);

  const addEntry = useCallback((entry) => {
    setEntries(prev => [...prev, { id: Date.now() + Math.random(), ...entry }]);
  }, []);

  const updateLastEntry = useCallback((updates) => {
    setEntries(prev => {
      if (!prev.length) return prev;
      return [...prev.slice(0, -1), { ...prev[prev.length - 1], ...updates }];
    });
  }, []);

  const resolveLastInterrupt = useCallback(() => {
    setEntries(prev => {
      if (!prev.length) return prev;
      return [...prev.slice(0, -1), { ...prev[prev.length - 1], resolved: true }];
    });
  }, []);

  // ── SSE connection ───────────────────────────────────────────────────────────
  const connectSSE = useCallback((threadId) => {
    if (esRef.current) esRef.current.close();

    // Pass JWT as query param since EventSource doesn't support custom headers
    const token = getToken();
    const url   = `${BASE_URL}/trips/${threadId}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const es    = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      let event;
      try { event = JSON.parse(e.data); } catch { return; }
      if (event.type === 'ping') return;

      if (event.type === 'node_start' || event.type === 'node_change') {
        const node  = event.node;
        const label = NODE_META[node]?.label || node;
        setCurrentLabel(label);
        setStatusState('working');
        setIsWorking(true);
        setEntries(prev => {
          const marked = prev.length && prev[prev.length - 1].status === 'running'
            ? [...prev.slice(0, -1), { ...prev[prev.length - 1], status: 'done' }]
            : prev;
          return [...marked, { id: Date.now() + Math.random(), node, status: 'running', type: 'node_progress', label }];
        });
      }

      if (event.type === 'interrupt') {
        const node = event.node;
        const iv   = event.interrupt_data;
        setIsWorking(false);
        setStatusState('working');
        const type = classifyInterrupt(iv);
        updateLastEntry({ status: 'waiting', type, interruptData: iv, resolved: false });
        setCurrentLabel(NODE_META[node]?.label || node);
      }

      if (event.type === 'graph_done') {
        const st = event.state || {};
        setFullState(st);
        setIsWorking(false);
        setStatusState('done');
        setCurrentLabel('Complete');
        updateLastEntry({ status: 'done' });
        if (st.itinerary) {
          addEntry({ node: 'draft_itinerary', status: 'done', type: 'itinerary', label: 'Itinerary ready', payload: st.itinerary });
        }
        if (st.booking_summary) {
          addEntry({ node: 'booking_summary', status: 'done', type: 'booking_summary', label: 'Booking summary', payload: st.booking_summary });
        }
        loadHistory();
      }

      if (event.type === 'error') {
        setIsWorking(false);
        setStatusState('error');
        updateLastEntry({ status: 'error', errorMsg: event.error });
        setCurrentLabel('Error');
      }

      if (event.type === 'stream_end') {
        es.close();
      }
    };

    es.onerror = () => {
      setTimeout(async () => {
        if (!activeRef.current) return;
        try {
          const st = await apiGet(`/trips/${activeRef.current}/state`);
          setRefinementsUsed(st.refinements_used || 0);
          setMaxRefinements(st.max_refinements || 3);
          setFullState(st.state);
        } catch (err) {
          if (err.message === '__UNAUTHORIZED__') handleUnauthorized();
        }
      }, 2000);
    };
  }, [addEntry, updateLastEntry, loadHistory, handleUnauthorized]);

  // ── Start new trip ───────────────────────────────────────────────────────────
  const handleStart = useCallback(async (formData) => {
    setEntries([]);
    setFullState(null);
    setShowForm(false);
    setIsWorking(true);
    setStatusState('working');
    setCurrentLabel('Starting…');
    setRefinementsUsed(0);

    try {
      const { thread_id } = await apiPost('/trips/start', formData);
      setActiveId(thread_id);
      connectSSE(thread_id);
      loadHistory();
    } catch (err) {
      if (err.message === '__UNAUTHORIZED__') { handleUnauthorized(); return; }
      setIsWorking(false);
      setStatusState('error');
      setCurrentLabel('Error');
      addEntry({ node: 'error', status: 'error', type: 'error', label: 'Failed to start', errorMsg: String(err) });
    }
  }, [connectSSE, loadHistory, addEntry, handleUnauthorized]);

  // ── Resume interrupt ─────────────────────────────────────────────────────────
  const handleResume = useCallback(async (value) => {
    if (!activeId) return;
    resolveLastInterrupt();
    setIsWorking(true);
    setStatusState('working');
    setCurrentLabel('Processing…');

    try {
      await apiPost(`/trips/${activeId}/resume`, { value });
    } catch (err) {
      if (err.message === '__UNAUTHORIZED__') { handleUnauthorized(); return; }
      setStatusState('error');
      addEntry({ node: 'error', status: 'error', type: 'error', label: 'Resume failed', errorMsg: String(err) });
    }
  }, [activeId, resolveLastInterrupt, addEntry, handleUnauthorized]);

  // ── Load a previous session ──────────────────────────────────────────────────
  // First checks the in-memory cache (so switching tabs never loses node history).
  // Falls back to /trips/{id}/nodes from the server if not in cache.
  const handleLoadSession = useCallback(async (threadId) => {
    // Save current session to cache first
    if (activeId) {
      sessionCache.current[activeId] = {
        entries, fullState, refinementsUsed, maxRefinements, statusState, currentLabel,
      };
    }

    // If we have a live cache hit, restore instantly
    const cached = sessionCache.current[threadId];
    if (cached) {
      esRef.current?.close();
      setActiveId(threadId);
      setShowForm(false);
      setEntries(cached.entries);
      setFullState(cached.fullState);
      setRefinementsUsed(cached.refinementsUsed);
      setMaxRefinements(cached.maxRefinements);
      setStatusState(cached.statusState);
      setCurrentLabel(cached.currentLabel);
      setIsWorking(false);

      // Re-open SSE if session was still active
      if (cached.statusState === 'working') {
        connectSSE(threadId);
      }
      return;
    }

    // Not in cache — load from server
    setEntries([]);
    setFullState(null);
    setShowForm(false);
    setActiveId(threadId);
    setIsWorking(false);

    try {
      // 1. Load persisted node history from DB
      const nodesData = await apiGet(`/trips/${threadId}/nodes`);
      const restoredEntries = (nodesData.nodes || []).map(dbNodeToEntry);
      setEntries(restoredEntries);

      // 2. Load current state for refinements etc.
      const st = await apiGet(`/trips/${threadId}/state`);
      setRefinementsUsed(st.refinements_used || 0);
      setMaxRefinements(st.max_refinements || 3);
      setFullState(st.state);

      if (st.is_done) {
        setStatusState('done');
        setCurrentLabel('Complete');
      } else {
        setStatusState('working');
        setCurrentLabel(st.current_label || 'Resuming…');
        // If there's a pending interrupt not already in the restored entries,
        // the SSE connection will re-deliver it when graph resumes.
        connectSSE(threadId);
      }
    } catch (err) {
      if (err.message === '__UNAUTHORIZED__') { handleUnauthorized(); return; }
      addEntry({ node: 'error', status: 'error', type: 'error', label: 'Could not load session', errorMsg: String(err) });
    }
  }, [activeId, entries, fullState, refinementsUsed, maxRefinements, statusState, currentLabel,
      addEntry, connectSSE, handleUnauthorized]);

  // ── Delete a session ─────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (threadId) => {
    try {
      await apiDelete(`/trips/${threadId}`);
      // Remove from cache
      delete sessionCache.current[threadId];
      // If deleting the active session, go back to new trip form
      if (activeId === threadId) {
        esRef.current?.close();
        setActiveId(null);
        setEntries([]);
        setFullState(null);
        setShowForm(true);
        setStatusState('');
        setCurrentLabel('Idle');
      }
      loadHistory();
    } catch (err) {
      if (err.message === '__UNAUTHORIZED__') handleUnauthorized();
    }
  }, [activeId, loadHistory, handleUnauthorized]);

  const handleNewTrip = () => {
    esRef.current?.close();
    setActiveId(null);
    setEntries([]);
    setFullState(null);
    setShowForm(true);
    setStatusState('');
    setCurrentLabel('Idle');
  };

  // ── Auth handlers ────────────────────────────────────────────────────────────
  const handleAuth = useCallback((data) => {
    const user = {
      user_id: data.user_id, username: data.username,
      display_name: data.display_name, avatar_url: data.avatar_url,
    };
    setAuthUser(user);
  }, []);

  const handleLogout = useCallback(() => {
    esRef.current?.close();
    clearAuth();
    setAuthUser(null);
    setSessions([]);
    setActiveId(null);
    setEntries([]);
    setFullState(null);
    setShowForm(true);
    sessionCache.current = {};
  }, []);

  // ── Render auth page if not logged in ────────────────────────────────────────
  if (!authUser) {
    return (
      <>
        <style>{STYLE}</style>
        <AuthPage onAuth={handleAuth} initialError={googleAuthError} />
      </>
    );
  }

  const activeSession = sessions.find(s => s.thread_id === activeId);

  return (
    <>
      <style>{STYLE}</style>
      <div className="shell">
        <Sidebar
          sessions={sessions}
          activeId={activeId}
          onSelect={handleLoadSession}
          onNew={handleNewTrip}
          onDelete={handleDelete}
          user={authUser}
          onLogout={handleLogout}
        />
        <main className="main">
          <div className="main-topbar">
            <div>
              <div className="main-topbar-title">
                {activeSession
                  ? `${activeSession.source} → ${activeSession.destination}`
                  : showForm ? 'New trip' : 'Trip planner'}
              </div>
              {activeId && <div className="main-topbar-sub">{activeId.slice(0, 8)}…</div>}
            </div>
            {statusState && (
              <div className="status-pill">
                <div className={`status-dot ${statusState}`} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentLabel}</span>
              </div>
            )}
          </div>
          {showForm
            ? <TripForm onSubmit={handleStart} isLoading={isWorking} />
            : <Feed entries={entries} onResume={handleResume} refinementsUsed={refinementsUsed} maxRefinements={maxRefinements} fullState={fullState} />
          }
        </main>
      </div>
    </>
  );
}