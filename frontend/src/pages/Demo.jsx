import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────────
   INLINE STYLES / CSS-IN-JS  (no Tailwind)
───────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

  :root {
    --bg-base:    #090d16;
    --bg-card:    #0e1422;
    --bg-panel:   #111827;
    --bg-input:   #0a0f1c;
    --border:     #1e2a3a;
    --border-bright: #253447;
    --accent:     #00e5a0;
    --accent-dim: #00b880;
    --accent-glow:rgba(0,229,160,0.18);
    --red:        #ff4d6d;
    --amber:      #f59e0b;
    --blue:       #3b82f6;
    --purple:     #8b5cf6;
    --text-1:     #e8f0fe;
    --text-2:     #8aa0bb;
    --text-3:     #4a607a;
    --mono:       'Space Mono', monospace;
    --sans:       'DM Sans', sans-serif;
    --radius:     10px;
    --transition: 0.18s ease;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg-base);
    color: var(--text-1);
    font-family: var(--sans);
    min-height: 100vh;
  }

  /* ── NAV ── */
  .so-nav {
    display: flex;
    align-items: center;
    gap: 2rem;
    padding: 0 2rem;
    height: 58px;
    background: #0b1120;
    border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 100;
  }
  .so-logo {
    display: flex; align-items: center; gap: .55rem;
    font-family: var(--sans); font-weight: 700; font-size: 1.1rem;
    color: var(--text-1); text-decoration: none;
  }
  .so-logo-icon {
    width: 34px; height: 34px; border-radius: 8px;
    background: var(--accent); display: grid; place-items: center;
    font-size: 1.1rem;
  }
  .so-logo span { color: var(--accent); font-size: .7rem; font-family: var(--mono); margin-left:2px; }
  .so-nav-links { display: flex; gap: 1.6rem; margin-left: 1.2rem; }
  .so-nav-links a {
    color: var(--text-2); font-size: .85rem; text-decoration: none;
    transition: color var(--transition);
  }
  .so-nav-links a:hover { color: var(--text-1); }
  .so-nav-right { margin-left: auto; display: flex; gap: .75rem; align-items: center; }
  .btn-ghost {
    padding: .42rem 1rem; border-radius: var(--radius);
    background: transparent; border: 1px solid var(--border-bright);
    color: var(--text-1); font-size: .82rem; cursor: pointer;
    transition: border-color var(--transition), color var(--transition);
    font-family: var(--sans);
  }
  .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
  /* Small nav button used for About — keep single-line and hide on small screens */
  .btn-return {
    padding: .38rem .9rem; border-radius: var(--radius);
    white-space: nowrap; display: inline-flex; align-items: center; gap: .4rem;
    font-size: .82rem; font-family: var(--sans); min-width: auto;
  }
  @media (max-width: 960px) { .btn-return { display: none !important; } }
  .btn-primary {
    padding: .42rem 1.1rem; border-radius: var(--radius);
    background: var(--accent); border: none;
    color: #050d0a; font-size: .82rem; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; gap: .4rem;
    transition: background var(--transition), transform .1s;
    font-family: var(--sans);
  }
  .btn-primary:hover { background: #00ffb3; }
  .btn-primary:active { transform: scale(0.97); }

  /* ── HERO ── */
  .so-hero {
    padding: 2.2rem 2rem 1.4rem;
    border-bottom: 1px solid var(--border);
  }
  .so-hero-tag {
    display: inline-block;
    padding: .22rem .7rem; border-radius: 4px;
    background: rgba(0,229,160,.12); border: 1px solid rgba(0,229,160,.3);
    color: var(--accent); font-family: var(--mono); font-size: .68rem;
    letter-spacing: .1em; margin-bottom: .8rem;
  }
  .so-hero h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: .35rem; }
  .so-hero p { color: var(--text-2); font-size: .88rem; max-width: 680px; }
  .so-hero-reset {
    padding: .38rem .9rem; border-radius: var(--radius);
    background: transparent; border: 1px solid var(--border-bright);
    color: var(--text-2); font-size: .78rem; cursor: pointer;
    transition: all var(--transition); font-family: var(--sans);
  }
  .so-hero-reset:hover { border-color: var(--red); color: var(--red); }

  /* ── LAYOUT ── */
  .so-main { display: grid; grid-template-columns: 1fr 360px; gap: 0; min-height: calc(100vh - 58px); }
  @media (max-width: 960px) { .so-main { grid-template-columns: 1fr; } }

  /* ── BOOKING FORM ── */
  .so-section { padding: 1.6rem 2rem; border-bottom: 1px solid var(--border); }
  .so-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.4rem 1.6rem;
  }
  .so-card-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 1.2rem;
  }
  .so-card-title {
    display: flex; align-items: center; gap: .6rem;
    font-size: .97rem; font-weight: 600;
  }
  .so-step-badge {
    padding: .18rem .65rem; border-radius: 4px;
    background: rgba(0,229,160,.1); border: 1px solid rgba(0,229,160,.25);
    color: var(--accent); font-family: var(--mono); font-size: .62rem; letter-spacing: .08em;
  }
  .so-label { font-size: .78rem; color: var(--text-2); margin-bottom: .4rem; display: block; }
  .so-input, .so-select {
    width: 100%; padding: .55rem .85rem;
    background: var(--bg-input); border: 1px solid var(--border-bright);
    border-radius: var(--radius); color: var(--text-1); font-size: .86rem;
    font-family: var(--sans); outline: none;
    transition: border-color var(--transition), box-shadow var(--transition);
  }
  .so-input:focus, .so-select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }
  .so-select { appearance: none; cursor: pointer; }
  .so-select option { background: var(--bg-panel); }
  .btn-create {
    width: 100%; padding: .7rem 1rem;
    background: var(--bg-panel); border: 1px solid var(--border-bright);
    border-radius: var(--radius); color: var(--text-1); font-size: .9rem;
    font-weight: 600; cursor: pointer; display: flex; align-items: center;
    justify-content: center; gap: .5rem;
    transition: all var(--transition); font-family: var(--sans);
  }
  .btn-create:hover { background: var(--accent); color: #050d0a; border-color: var(--accent); }

  /* ── TABS ── */
  .so-tabs { display: flex; border-bottom: 1px solid var(--border); padding: 0 2rem; overflow-x: auto; }
  .so-tab {
    padding: .85rem 1.2rem; font-size: .78rem; font-weight: 600;
    color: var(--text-3); cursor: pointer; border-bottom: 2px solid transparent;
    white-space: nowrap; display: flex; align-items: center; gap: .5rem;
    transition: all var(--transition); letter-spacing: .04em;
    background: transparent; border-left: none; border-right: none; border-top: none;
    font-family: var(--sans);
  }
  .so-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .so-tab:hover:not(.active) { color: var(--text-1); }

  /* ── TABLE ── */
  .so-table-wrap { padding: 1.4rem 2rem; }
  .so-table-head {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 1rem;
  }
  .so-table-title { font-size: 1rem; font-weight: 600; }
  .so-live-badge {
    font-size: .72rem; color: var(--text-3); font-family: var(--mono);
    display: flex; align-items: center; gap: .4rem;
  }
  .so-live-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--accent); animation: pulse 1.8s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: .4; transform: scale(.75); }
  }

  .so-table { width: 100%; border-collapse: collapse; }
  .so-table th {
    text-align: left; padding: .55rem .8rem;
    font-size: .68rem; color: var(--text-3); font-family: var(--mono);
    letter-spacing: .09em; border-bottom: 1px solid var(--border);
    font-weight: 400;
  }
  .so-table td {
    padding: .9rem .8rem; border-bottom: 1px solid var(--border);
    font-size: .84rem; vertical-align: middle;
  }
  .so-table tr:last-child td { border-bottom: none; }
  .so-table tr:hover td { background: rgba(255,255,255,.02); }

  .guest-name { font-weight: 600; font-size: .87rem; }
  .guest-email { color: var(--text-3); font-size: .74rem; margin-top: 2px; }

  .booking-id { font-family: var(--mono); font-size: .78rem; color: var(--text-2); }

  .tier-badge {
    display: inline-block; padding: .18rem .6rem; border-radius: 4px;
    font-size: .68rem; font-weight: 700; letter-spacing: .06em; font-family: var(--mono);
  }
  .tier-vip    { background: rgba(245,158,11,.15); color: var(--amber); border: 1px solid rgba(245,158,11,.3); }
  .tier-corp   { background: rgba(59,130,246,.15);  color: var(--blue);  border: 1px solid rgba(59,130,246,.3); }
  .tier-reg    { background: rgba(139,92,246,.15);  color: var(--purple);border: 1px solid rgba(139,92,246,.3); }

  .allot-cell { display: flex; flex-direction: column; gap: 4px; }
  .allot-room, .allot-slot {
    display: inline-flex; align-items: center; gap: .35rem;
    font-size: .78rem; font-family: var(--mono);
  }
  .allot-room { color: var(--amber); }
  .allot-slot { color: var(--text-2); }
  .unassigned { color: var(--text-3); font-size: .78rem; font-family: var(--mono); }

  .status-badge {
    display: inline-flex; align-items: center; gap: .4rem;
    padding: .22rem .7rem; border-radius: 20px; font-size: .72rem; font-weight: 600;
  }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; }
  .s-checkedin { background: rgba(0,229,160,.12); color: var(--accent); border: 1px solid rgba(0,229,160,.3); }
  .s-checkedin .status-dot { background: var(--accent); }
  .s-confirmed { background: rgba(245,158,11,.12); color: var(--amber); border: 1px solid rgba(245,158,11,.3); }
  .s-confirmed .status-dot { background: var(--amber); }
  .s-checkout  { background: rgba(255,77,109,.12); color: var(--red); border: 1px solid rgba(255,77,109,.3); }
  .s-checkout .status-dot { background: var(--red); }

  .btn-action {
    padding: .38rem .9rem; border-radius: var(--radius); font-size: .78rem;
    font-weight: 600; cursor: pointer; transition: all var(--transition);
    border: none; font-family: var(--sans);
  }
  .btn-checkout { background: transparent; border: 1px solid var(--red); color: var(--red); }
  .btn-checkout:hover { background: var(--red); color: #fff; }
  .btn-checkin  { background: var(--accent); color: #050d0a; }
  .btn-checkin:hover { background: #00ffb3; }
  .btn-done     { background: transparent; border: 1px solid var(--border-bright); color: var(--text-3); }

  /* ── PARKING TAB ── */
  .so-parking-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: .8rem;
    padding: 1.4rem 2rem;
  }
  .parking-slot {
    border-radius: var(--radius); border: 1px solid var(--border);
    padding: .8rem .5rem; text-align: center; font-family: var(--mono);
    font-size: .78rem; transition: all var(--transition); cursor: default;
  }
  .parking-slot.occupied {
    border-color: rgba(245,158,11,.4); background: rgba(245,158,11,.06); color: var(--amber);
  }
  .parking-slot.free {
    border-color: rgba(0,229,160,.3); background: rgba(0,229,160,.04); color: var(--accent);
  }
  .parking-slot .slot-id { font-size: .95rem; font-weight: 700; margin-bottom: 4px; }
  .parking-slot .slot-status { font-size: .63rem; opacity: .7; }

  /* ── LUGGAGE TAB ── */
  .so-luggage-list { padding: 1.4rem 2rem; display: flex; flex-direction: column; gap: .8rem; }
  .luggage-item {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius); padding: .9rem 1.1rem;
    display: flex; justify-content: space-between; align-items: center;
  }
  .luggage-info .li-name { font-weight: 600; font-size: .87rem; }
  .luggage-info .li-bags { font-size: .75rem; color: var(--text-2); margin-top: 2px; }
  .luggage-status-badge {
    padding: .22rem .7rem; border-radius: 20px; font-size: .72rem; font-weight: 600;
    font-family: var(--mono);
  }
  .ls-delivered  { background: rgba(0,229,160,.12); color: var(--accent); border: 1px solid rgba(0,229,160,.3); }
  .ls-pending    { background: rgba(245,158,11,.12); color: var(--amber); border: 1px solid rgba(245,158,11,.3); }
  .ls-transit    { background: rgba(59,130,246,.12); color: var(--blue);  border: 1px solid rgba(59,130,246,.3); }

  /* ── RIGHT PANEL ── */
  .so-right {
    border-left: 1px solid var(--border);
    display: flex; flex-direction: column;
    height: calc(100vh - 58px); position: sticky; top: 58px;
    background: var(--bg-card);
  }
  .so-bot-header {
    padding: 1rem 1.2rem; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: .8rem;
  }
  .bot-icon {
    width: 38px; height: 38px; border-radius: 10px;
    background: rgba(0,229,160,.12); border: 1px solid rgba(0,229,160,.2);
    display: grid; place-items: center; font-size: 1.1rem; position: relative;
  }
  .bot-online {
    width: 9px; height: 9px; border-radius: 50%; background: var(--accent);
    position: absolute; bottom: 1px; right: 1px;
    border: 2px solid var(--bg-card);
  }
  .bot-name { font-weight: 700; font-size: .92rem; }
  .bot-sub { font-size: .72rem; color: var(--text-2); margin-top: 1px; }

  /* chat messages */
  .so-chat-messages {
    flex: 1; overflow-y: auto; padding: 1rem 1.2rem;
    display: flex; flex-direction: column; gap: .7rem;
    scrollbar-width: thin; scrollbar-color: var(--border) transparent;
  }
  .chat-msg {
    max-width: 88%; padding: .65rem .9rem; border-radius: 10px; font-size: .82rem;
    line-height: 1.45; animation: fadeUp .22s ease;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .chat-msg.bot {
    background: var(--bg-panel); border: 1px solid var(--border);
    color: var(--text-1); border-bottom-left-radius: 3px;
    align-self: flex-start;
  }
  .chat-msg.user {
    background: var(--accent); color: #050d0a; font-weight: 500;
    border-bottom-right-radius: 3px; align-self: flex-end;
  }
  .chat-time { font-size: .65rem; color: var(--text-3); margin-top: 3px; font-family: var(--mono); }

  /* quick cmds */
  .so-quick-cmds {
    padding: .75rem 1.2rem .5rem; border-top: 1px solid var(--border);
    display: flex; flex-wrap: wrap; gap: .45rem;
  }
  .quick-cmd {
    padding: .28rem .75rem; border-radius: 20px;
    background: var(--bg-panel); border: 1px solid var(--border-bright);
    color: var(--text-2); font-size: .73rem; cursor: pointer;
    transition: all var(--transition); font-family: var(--sans);
  }
  .quick-cmd:hover { border-color: var(--accent); color: var(--accent); }

  /* input */
  .so-chat-input {
    padding: .7rem 1rem; border-top: 1px solid var(--border);
    display: flex; gap: .5rem; align-items: center;
  }
  .chat-field {
    flex: 1; background: var(--bg-input); border: 1px solid var(--border-bright);
    border-radius: 20px; padding: .5rem 1rem; color: var(--text-1);
    font-size: .82rem; font-family: var(--sans); outline: none;
    transition: border-color var(--transition);
  }
  .chat-field:focus { border-color: var(--accent); }
  .chat-send {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--accent); border: none; cursor: pointer;
    display: grid; place-items: center; color: #050d0a; font-size: .95rem;
    transition: background var(--transition), transform .1s;
    flex-shrink: 0;
  }
  .chat-send:hover { background: #00ffb3; }
  .chat-send:active { transform: scale(.93); }

  /* ── TELEMETRY ── */
  .so-telem {
    border-top: 1px solid var(--border); padding: .8rem 1.2rem;
    max-height: 200px; overflow-y: auto;
    scrollbar-width: thin; scrollbar-color: var(--border) transparent;
  }
  .telem-header {
    display: flex; align-items: center; gap: .5rem;
    font-size: .72rem; font-weight: 700; letter-spacing: .08em;
    color: var(--text-2); margin-bottom: .6rem; font-family: var(--mono);
  }
  .telem-entry {
    display: flex; gap: .55rem; margin-bottom: .5rem; font-size: .73rem;
    align-items: flex-start; animation: fadeUp .22s ease;
  }
  .telem-time { color: var(--text-3); font-family: var(--mono); flex-shrink: 0; margin-top: 1px; }
  .telem-tag {
    padding: .1rem .45rem; border-radius: 3px; font-size: .62rem;
    font-weight: 700; font-family: var(--mono); flex-shrink: 0; letter-spacing: .04em; margin-top:1px;
  }
  .tag-booking { background: rgba(59,130,246,.2); color: var(--blue); }
  .tag-telegram { background: rgba(0,229,160,.2); color: var(--accent); }
  .tag-parking  { background: rgba(245,158,11,.2); color: var(--amber); }
  .tag-luggage  { background: rgba(139,92,246,.2); color: var(--purple); }
  .tag-system   { background: rgba(255,77,109,.2); color: var(--red); }
  .telem-text { color: var(--text-2); line-height: 1.4; }

  /* ── FOOTER ── */
  .so-footer {
    padding: 2rem; text-align: center; border-top: 1px solid var(--border);
    color: var(--text-3); font-size: .8rem;
  }
  .so-footer strong { color: var(--text-2); }

  /* ── TOAST ── */
  .so-toast {
    position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
    background: var(--bg-panel); border: 1px solid var(--accent);
    border-radius: var(--radius); padding: .65rem 1.3rem;
    font-size: .83rem; color: var(--accent); font-family: var(--mono);
    z-index: 999; animation: toastIn .25s ease;
    box-shadow: 0 4px 24px rgba(0,229,160,.2);
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(12px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  /* room occupancy */
  .room-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: .8rem; padding: 1.4rem 2rem;
  }
  .room-card {
    border-radius: var(--radius); border: 1px solid var(--border);
    padding: .9rem .8rem; text-align: center; font-size: .78rem;
    transition: all var(--transition);
  }
  .room-card.occupied { border-color: rgba(255,77,109,.35); background: rgba(255,77,109,.05); }
  .room-card.vacant   { border-color: rgba(0,229,160,.3);  background: rgba(0,229,160,.04); }
  .room-card.cleaning { border-color: rgba(59,130,246,.3); background: rgba(59,130,246,.05); }
  .room-num { font-family: var(--mono); font-weight: 700; font-size: 1rem; margin-bottom: 4px; }
  .room-type { color: var(--text-2); font-size: .68rem; margin-bottom: 6px; }
  .room-state {
    font-size: .63rem; font-family: var(--mono); font-weight: 600; letter-spacing: .06em;
  }
  .room-card.occupied .room-state { color: var(--red); }
  .room-card.vacant   .room-state { color: var(--accent); }
  .room-card.cleaning .room-state { color: var(--blue); }
`;

/* ──────────────────────────────────────────
   DATA
────────────────────────────────────────── */
const TIERS   = ["Regular (Standard logistics)", "Corporate (Priority access)", "VIP (Full concierge)"];
const ROOMS   = ["Standard Room", "Deluxe Premium Suite", "Executive Suite", "Presidential Suite"];
const ROOMS_DB = [
  { num:"101", type:"Standard",  state:"vacant" },
  { num:"102", type:"Standard",  state:"occupied" },
  { num:"103", type:"Deluxe",    state:"cleaning" },
  { num:"104", type:"Deluxe",    state:"vacant" },
  { num:"105", type:"Executive", state:"occupied" },
  { num:"106", type:"Executive", state:"vacant" },
  { num:"107", type:"Suite",     state:"occupied" },
  { num:"108", type:"Suite",     state:"cleaning" },
  { num:"109", type:"Standard",  state:"vacant" },
  { num:"110", type:"Deluxe",    state:"vacant" },
  { num:"111", type:"Standard",  state:"occupied" },
  { num:"112", type:"Executive", state:"vacant" },
];
const PARKING_SLOTS = [
  { id:"P-1", status:"occupied", guest:"Hendricks" },
  { id:"P-2", status:"free" },
  { id:"P-3", status:"occupied", guest:"Bachman" },
  { id:"P-4", status:"free" },
  { id:"P-5", status:"free" },
  { id:"P-6", status:"free" },
  { id:"P-7", status:"occupied", guest:"Hall" },
  { id:"P-8", status:"free" },
];

const INIT_BOOKINGS = [
  {
    id:"BK-9201", name:"Richard Hendricks", email:"richard@piedpiper.com",
    tier:"VIP", roomType:"Suite", room:"107", slot:"P-1",
    status:"checked-in", bags:1,
  },
  {
    id:"BK-4819", name:"Erlich Bachman", email:"bachman@aviato.co",
    tier:"Corporate", roomType:"Executive", room:"105", slot:"P-3",
    status:"checked-in", bags:2,
  },
  {
    id:"BK-3392", name:"Monica Hall", email:"monica@raviga.com",
    tier:"Regular", roomType:"Deluxe", room:null, slot:null,
    status:"confirmed", bags:3,
  },
];

const INIT_TELEM = [
  { time:"18:15:04", tag:"booking",  text:"Corporate booking BK-4819 registered for Erlich Bachman." },
  { time:"18:18:22", tag:"telegram", text:"Guest Erlich Bachman linked Telegram handle @bachman_aviato." },
  { time:"18:20:11", tag:"booking",  text:"Guest Richard Hendricks checked in. Room 107 auto-allocated." },
];

const BOT_RESPONSES = {
  "check status":     (b) => b.length ? `📋 ${b.length} active booking(s). Latest: ${b[0].name} in Room ${b[0].room || "TBD"}.` : "No bookings found.",
  "my parking slot":  (b) => { const g = b.find(x=>x.slot); return g ? `🚗 Parking slot ${g.slot} assigned to ${g.name}.` : "No parking slots currently assigned."; },
  "luggage status":   (b) => `🧳 Tracking ${b.reduce((a,x)=>a+x.bags,0)} bag(s) across ${b.length} guest(s).`,
  "express checkout": (b) => { const g = b.find(x=>x.status==="checked-in"); return g ? `✅ Express checkout initiated for ${g.name} (${g.id}).` : "No checked-in guests found."; },
  "request towels":   () => "🛁 Housekeeping notified. Towels will arrive in ~10 minutes.",
  default: (input) => `🤖 Processing: "${input}" — Command routed to operations workflow.`,
};

function fmt(d) {
  return d.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
}

/* ──────────────────────────────────────────
   COMPONENT
────────────────────────────────────────── */
export default function Demo() {
  const [bookings, setBookings]   = useState(INIT_BOOKINGS);
  const [form, setForm]           = useState({ name:"", email:"", tier: TIERS[0], room: ROOMS[1], bags: 2 });
  const [tab, setTab]             = useState("bookings");
  const [messages, setMessages]   = useState([
    { role:"bot", text:"🏨 Welcome to StayHops AI Virtual Guest Bot. Chat with me or tap standard commands below to track operations!", time: fmt(new Date()) }
  ]);
  const [telem, setTelem]         = useState(INIT_TELEM);
  const [chatInput, setChatInput] = useState("");
  const [toast, setToast]         = useState(null);
  const [parking, setParking]     = useState(PARKING_SLOTS);
  const chatRef  = useRef(null);
  const telemRef = useRef(null);
  const navigate = useNavigate();

  /* inject CSS once (synchronously before paint to avoid layout jumps) */
  useLayoutEffect(() => {
    const tag = document.createElement("style");
    tag.textContent = CSS;
    document.head.appendChild(tag);
    return () => document.head.removeChild(tag);
  }, []);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: 9999, behavior:"smooth" });
  }, [messages]);
  useEffect(() => {
    telemRef.current?.scrollTo({ top: 9999, behavior:"smooth" });
  }, [telem]);

  /* ── helpers ── */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const addTelem = (tag, text) => {
    setTelem(p => [...p, { time: fmt(new Date()), tag, text }]);
  };

  const freeRooms = () => {
    const occupied = bookings.map(b=>b.room).filter(Boolean);
    return ["101","102","103","104","105","106","107","108","109","110","111","112"]
      .filter(r => !occupied.includes(r));
  };
  const freePark = () => {
    const occupied = bookings.map(b=>b.slot).filter(Boolean);
    return ["P-1","P-2","P-3","P-4","P-5","P-6","P-7","P-8"].filter(s=>!occupied.includes(s));
  };

  /* create booking */
  const createBooking = () => {
    if (!form.name.trim() || !form.email.trim()) {
      showToast("⚠ Please fill Guest Name & Email first."); return;
    }
    const id = `BK-${Math.floor(1000 + Math.random()*9000)}`;
    const tier = form.tier.includes("VIP") ? "VIP"
               : form.tier.includes("Corporate") ? "Corporate" : "Regular";
    const nb = {
      id, name: form.name, email: form.email,
      tier, roomType: form.room.split(" ")[0], room: null, slot: null,
      status:"confirmed", bags: Number(form.bags),
    };
    setBookings(p => [...p, nb]);
    addTelem("booking", `New booking ${id} created for ${form.name} (${tier}).`);
    setForm(f => ({ ...f, name:"", email:"" }));
    showToast(`✅ Booking ${id} created!`);
  };

  /* check in */
  const checkIn = (id) => {
    const r = freeRooms()[0];
    const s = freePark()[0];
    if (!r) { showToast("⚠ No rooms available!"); return; }
    setBookings(p => p.map(b => b.id===id
      ? { ...b, status:"checked-in", room: r, slot: s || null }
      : b
    ));
    const b = bookings.find(x=>x.id===id);
    addTelem("booking", `Guest ${b?.name} checked in. Room ${r} auto-allocated.`);
    if (s) {
      setParking(p => p.map(pk => pk.id===s ? { ...pk, status:"occupied", guest: b?.name.split(" ")[0] } : pk));
      addTelem("parking", `Parking slot ${s} assigned to ${b?.name}.`);
    }
    showToast(`🛎 Check-in complete — Room ${r}`);
  };

  /* check out */
  const checkOut = (id) => {
    const b = bookings.find(x=>x.id===id);
    setBookings(p => p.map(bk => bk.id===id
      ? { ...bk, status:"checked-out", room: null, slot: null }
      : bk
    ));
    if (b?.slot) setParking(p => p.map(pk => pk.id===b.slot ? { id:pk.id, status:"free" } : pk));
    addTelem("booking", `Guest ${b?.name} checked out. Room ${b?.room} released.`);
    showToast(`👋 ${b?.name} checked out`);
    setTimeout(() => setBookings(p => p.filter(bk => bk.id!==id)), 1200);
  };

  /* chat */
  const sendChat = (text) => {
    const msg = text.trim().toLowerCase();
    if (!msg) return;
    const now = fmt(new Date());
    setMessages(p => [...p, { role:"user", text, time: now }]);
    setChatInput("");
    const key = Object.keys(BOT_RESPONSES).find(k => msg.includes(k)) || "default";
    const fn = BOT_RESPONSES[key];
    const reply = typeof fn === "function" ? fn(bookings, msg) : fn;
    setTimeout(() => {
      setMessages(p => [...p, { role:"bot", text: reply, time: fmt(new Date()) }]);
      addTelem("telegram", `Guest queried: "${text.substring(0,40)}"`);
    }, 700);
  };

  /* ── tier display ── */
  const tierClass = (t) => t==="VIP"?"tier-vip":t==="Corporate"?"tier-corp":"tier-reg";

  const activeBookings = bookings.filter(b => b.status!=="checked-out");

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-base)" }}>

      {/* ── NAV ── */}
      <nav className="so-nav">
        <a href="#" className="so-logo">
          <div className="so-logo-icon">🏨</div>
          StayHops <span>AI</span>
        </a>
        <div className="so-nav-links">
          <a href="#">Platform Overview</a>
          <a href="#">Problem Statement</a>
          <a href="#">Core Features</a>
          <a href="#">Architecture</a>
        </div>
        <div className="so-nav-right">
          <button className="btn-ghost btn-return" onClick={() => navigate('/')}>About</button>
          <button className="btn-primary" onClick={() => navigate('/admin/login')}>▶ Launch Live Portal</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="so-hero" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"1rem" }}>
        <div>
          <div className="so-hero-tag">VIRTUAL PLAYGROUND HUB</div>
          <h1>Resort Control &amp; Operations Panel</h1>
          <p>Interact with the hotel simulation below. Trigger active check-ins, view slot parking, assign luggage priorities, and watch the events fire live in the telemetry console!</p>
        </div>
        <button className="so-hero-reset" onClick={() => {
          setBookings(INIT_BOOKINGS);
          setTelem(INIT_TELEM);
          setParking(PARKING_SLOTS);
          setMessages([{ role:"bot", text:"🏨 Resort state has been reset to defaults.", time: fmt(new Date()) }]);
          showToast("🔄 Resort state reset");
        }}>Reset Resort State</button>
      </div>

      {/* ── MAIN GRID ── */}
      <div>
      <div className="so-main">

        {/* ─── LEFT COLUMN ─── */}
        <div>

          {/* BOOKING FORM */}
          <div className="so-section">
            <div className="so-card">
              <div className="so-card-header">
                <div className="so-card-title">
                  <span>👤</span> Resort Registrar &amp; Room Booking System
                </div>
                <div className="so-step-badge">STEP 1: ADD BOOKING</div>
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="so-label">Guest Full Name</label>
                  <input className="so-input" placeholder="e.g. Richard Hendricks"
                    value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
                </div>
                <div className="col-md-6">
                  <label className="so-label">Email Address</label>
                  <input className="so-input" type="email" placeholder="e.g. richard@piedpiper.com"
                    value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
                </div>
                <div className="col-md-6">
                  <label className="so-label">Guest Tier Profile</label>
                  <select className="so-select"
                    value={form.tier} onChange={e=>setForm(f=>({...f,tier:e.target.value}))}>
                    {TIERS.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="so-label">Preferred Room Category</label>
                  <select className="so-select"
                    value={form.room} onChange={e=>setForm(f=>({...f,room:e.target.value}))}>
                    {ROOMS.map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="so-label">Luggage Count (bags)</label>
                  <input className="so-input" type="number" min="0" max="10"
                    value={form.bags} onChange={e=>setForm(f=>({...f,bags:e.target.value}))} />
                </div>
                <div className="col-md-6 d-flex align-items-end">
                  <button className="btn-create w-100" onClick={createBooking}>+ Create Reservation File</button>
                </div>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="so-tabs">
            {[
              { key:"bookings", label:"📋 BOOKINGS PORTAL" },
              { key:"rooms",    label:"🏠 ROOM OCCUPANCY LOGS" },
              { key:"parking",  label:"🔗 SMART PARKING BAYS" },
              { key:"luggage",  label:"🧳 SUITCASE CARRIER HUB" },
            ].map(t => (
              <button key={t.key} className={`so-tab ${tab===t.key?"active":""}`}
                onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </div>

          {/* BOOKINGS */}
          {tab==="bookings" && (
            <div className="so-table-wrap">
              <div className="so-table-head">
                <div className="so-table-title">Active Reservation Registers</div>
                <div className="so-live-badge">
                  <div className="so-live-dot" /> Live checks &amp; QR trigger events
                </div>
              </div>
              {activeBookings.length === 0
                ? <div style={{ color:"var(--text-3)", textAlign:"center", padding:"2rem", fontFamily:"var(--mono)", fontSize:".8rem" }}>No active reservations</div>
                : <table className="so-table">
                    <thead>
                      <tr>
                        <th>GUEST INFO</th><th>BOOKING ID</th><th>TIER</th>
                        <th>ROOM SPEC</th><th>ALLOTMENT</th><th>STATUS</th><th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeBookings.map(b => (
                        <tr key={b.id}>
                          <td>
                            <div className="guest-name">{b.name}</div>
                            <div className="guest-email">{b.email}</div>
                          </td>
                          <td><span className="booking-id">{b.id}</span></td>
                          <td><span className={`tier-badge ${tierClass(b.tier)}`}>{b.tier.toUpperCase()}</span></td>
                          <td style={{ color:"var(--text-2)", fontSize:".82rem" }}>{b.roomType}</td>
                          <td>
                            {b.room
                              ? <div className="allot-cell">
                                  <span className="allot-room">🟧 Room {b.room}</span>
                                  {b.slot && <span className="allot-slot">🚗 Slot {b.slot}</span>}
                                </div>
                              : <span className="unassigned">Unassigned</span>
                            }
                          </td>
                          <td>
                            {b.status==="checked-in"
                              ? <span className="status-badge s-checkedin"><span className="status-dot"/>CHECKED IN</span>
                              : <span className="status-badge s-confirmed"><span className="status-dot"/>CONFIRMED</span>
                            }
                          </td>
                          <td>
                            {b.status==="checked-in"
                              ? <button className="btn-action btn-checkout" onClick={()=>checkOut(b.id)}>Checkout</button>
                              : <button className="btn-action btn-checkin"  onClick={()=>checkIn(b.id)}>Check In</button>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
            </div>
          )}

          {/* ROOMS */}
          {tab==="rooms" && (
            <div>
              <div className="so-table-head" style={{ padding:"1.4rem 2rem 0" }}>
                <div className="so-table-title">Room Occupancy Overview</div>
                <div className="so-live-badge"><div className="so-live-dot"/> Live status</div>
              </div>
              <div className="room-grid">
                {ROOMS_DB.map(r => {
                  const occupied = bookings.find(b=>b.room===r.num);
                  const state = occupied ? "occupied" : r.state==="cleaning" ? "cleaning" : "vacant";
                  return (
                    <div key={r.num} className={`room-card ${state}`}>
                      <div className="room-num">{r.num}</div>
                      <div className="room-type">{r.type}</div>
                      <div className="room-state">
                        {state==="occupied" ? "OCCUPIED" : state==="cleaning" ? "CLEANING" : "VACANT"}
                      </div>
                      {occupied && <div style={{ fontSize:".63rem", color:"var(--text-3)", marginTop:4 }}>{occupied.name.split(" ")[0]}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PARKING */}
          {tab==="parking" && (
            <div>
              <div className="so-table-head" style={{ padding:"1.4rem 2rem 0" }}>
                <div className="so-table-title">Smart Parking Bay Status</div>
                <div className="so-live-badge"><div className="so-live-dot"/> Real-time</div>
              </div>
              <div className="so-parking-grid">
                {parking.map(s => (
                  <div key={s.id} className={`parking-slot ${s.status}`}>
                    <div className="slot-id">{s.id}</div>
                    <div style={{ fontSize:"1.2rem", marginBottom:4 }}>{s.status==="occupied"?"🚗":"✅"}</div>
                    <div className="slot-status">{s.status==="occupied" ? s.guest || "Occupied" : "Free"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LUGGAGE */}
          {tab==="luggage" && (
            <div>
              <div className="so-table-head" style={{ padding:"1.4rem 2rem 0" }}>
                <div className="so-table-title">Suitcase Carrier Hub</div>
                <div className="so-live-badge"><div className="so-live-dot"/> Tracking</div>
              </div>
              <div className="so-luggage-list">
                {activeBookings.map(b => (
                  <div key={b.id} className="luggage-item">
                    <div className="luggage-info">
                      <div className="li-name">{b.name}</div>
                      <div className="li-bags">{b.id} · {b.bags} bag{b.bags!==1?"s":""}</div>
                    </div>
                    <span className={`luggage-status-badge ${b.status==="checked-in" ? "ls-delivered" : "ls-pending"}`}>
                      {b.status==="checked-in" ? "DELIVERED" : "PENDING"}
                    </span>
                  </div>
                ))}
                {activeBookings.length===0 && (
                  <div style={{ color:"var(--text-3)", textAlign:"center", padding:"2rem", fontFamily:"var(--mono)", fontSize:".8rem" }}>No luggage records</div>
                )}
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div className="so-footer">
            <div style={{ fontSize:"1.1rem", marginBottom:".5rem" }}>🏨 <strong>StayHops AI</strong></div>
            Full-stack hotel automated systems. Engineered with React 19, Vite TS, and event-triggered workflow logistics.
          </div>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <div className="so-right">

          {/* bot header */}
          <div className="so-bot-header">
            <div className="bot-icon">
              📱 <div className="bot-online" />
            </div>
            <div>
              <div className="bot-name">StayHops AI Virtual Bot</div>
              <div className="bot-sub">Conversational Web Console Simulator</div>
            </div>
          </div>

          {/* messages */}
          <div className="so-chat-messages" ref={chatRef}>
            {messages.map((m,i) => (
              <div key={i}>
                <div className={`chat-msg ${m.role}`}>{m.text}</div>
                <div className="chat-time" style={{ textAlign: m.role==="user"?"right":"left" }}>{m.time}</div>
              </div>
            ))}
          </div>

          {/* quick commands */}
          <div className="so-quick-cmds">
            {["Check Status","My Parking Slot","Luggage Status","Express Checkout","Request Towels"].map(c=>(
              <button key={c} className="quick-cmd" onClick={()=>sendChat(c)}>{c}</button>
            ))}
          </div>

          {/* chat input */}
          <div className="so-chat-input">
            <input className="chat-field"
              placeholder="Type commands or ask in Natural Text..."
              value={chatInput}
              onChange={e=>setChatInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") sendChat(chatInput); }}
            />
            <button className="chat-send" onClick={()=>sendChat(chatInput)}>➤</button>
          </div>

          {/* telemetry */}
          <div className="so-telem" ref={telemRef}>
            <div className="telem-header">
              📈 LIVE TELEMETRY EVENT FEED
            </div>
            {telem.map((t,i) => (
              <div key={i} className="telem-entry">
                <span className="telem-time">[{t.time}]</span>
                <span className={`telem-tag tag-${t.tag}`}>{t.tag.toUpperCase()}</span>
                <span className="telem-text">{t.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* TOAST */}
      {toast && <div className="so-toast">{toast}</div>}
    </div>
  );
}