import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Car, Package, MessageCircle, Settings, Hotel,
  ArrowRight, CheckCircle, Zap, Shield, Activity,
  GitBranch, Cpu, Lock
} from "lucide-react";

// ─── Global CSS ───────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..600&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --n0: #020810;
  --n1: #040e1c;
  --n2: #071526;
  --n3: #0d2040;
  --n4: #14305a;
  --gold: #e8a020;
  --gold-l: #f5bc4f;
  --teal: #00c9a7;
  --teal-d: #009b82;
  --purple: #7b8cff;
  --coral: #ff8c69;
  --text: #dce6f5;
  --muted: #6e839f;
  --border: rgba(255,255,255,0.07);
  --card: rgba(7,21,38,0.9);
}

*,*::before,*::after { box-sizing: border-box; }

html {
  scroll-behavior: smooth;
  scroll-padding-top: 80px; /* Prevents the fixed navbar from covering the section titles */
}

body, #root {
  background: var(--n0);
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  overflow-x: hidden;
  margin: 0;
}

/* ── NAVBAR ── */
.so-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 200;
  height: 64px; padding: 0 2.5rem;
  display: flex; align-items: center; justify-content: space-between;
  transition: background 0.35s, border-color 0.35s;
  border-bottom: 1px solid transparent;
}
.so-nav.scrolled {
  background: rgba(2,8,16,0.92);
  backdrop-filter: blur(16px);
  border-bottom-color: var(--border);
}
.so-logo {
  font-family: 'Playfair Display', serif;
  font-size: 1.4rem; font-weight: 700;
  color: var(--text); letter-spacing: -0.01em;
  display: flex; align-items: center; gap: 2px;
}
.so-logo em { color: var(--gold); font-style: normal; }
.so-links { display: flex; gap: 2.25rem; list-style: none; margin: 0; padding: 0; }
.so-links a {
  color: var(--muted); font-size: 0.875rem; font-weight: 500;
  text-decoration: none; transition: color 0.2s;
}
.so-links a:hover { color: var(--text); }
.so-btn-cta {
  background: var(--gold); color: #020810;
  border: none; border-radius: 7px;
  padding: 0.5rem 1.25rem;
  font-weight: 600; font-size: 0.85rem; cursor: pointer;
  transition: all 0.2s; letter-spacing: 0.01em;
}
.so-btn-cta:hover { background: var(--gold-l); transform: translateY(-1px); }

/* ── HERO ── */
.so-hero {
  min-height: 100vh;
  display: flex; align-items: center;
  padding: 6rem 2.5rem 4rem;
  position: relative; overflow: hidden;
  text-align: center;
}
.so-hero-bg {
  position: absolute; inset: 0; z-index: 0;
  background:
    radial-gradient(ellipse 85% 55% at 50% -10%, rgba(232,160,32,0.08) 0%, transparent 60%),
    radial-gradient(ellipse 55% 45% at 85% 65%, rgba(0,201,167,0.05) 0%, transparent 55%),
    linear-gradient(180deg, var(--n0) 0%, var(--n1) 60%, var(--n0) 100%);
}
.so-hero-grid {
  position: absolute; inset: 0; z-index: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 80% 65% at 50% 35%, black 10%, transparent 80%);
}
.so-hero-content {
  max-width: 920px; margin: 0 auto; position: relative; z-index: 1;
}
.so-badge {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: rgba(232,160,32,0.1); border: 1px solid rgba(232,160,32,0.22);
  border-radius: 100px; padding: 0.35rem 1rem;
  font-size: 0.78rem; font-weight: 500; color: var(--gold-l);
  margin-bottom: 2rem; letter-spacing: 0.06em; text-transform: uppercase;
}
.so-badge-dot {
  width: 6px; height: 6px;
  background: var(--gold); border-radius: 50%;
  animation: pulse 2.2s ease infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.75); }
}
.so-h1 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(2.6rem, 6.5vw, 4.8rem);
  font-weight: 700; line-height: 1.08;
  letter-spacing: -0.025em; color: var(--text);
  margin: 0 0 1.5rem;
}
.so-h1 .gold { color: var(--gold); }
.so-h1 .italic { font-style: italic; }
.so-hero-sub {
  font-size: 1.075rem; font-weight: 300;
  color: var(--muted); line-height: 1.75;
  max-width: 600px; margin: 0 auto 2.5rem;
}
.so-ctas { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
.so-btn-primary {
  background: var(--gold); color: #020810;
  border: none; border-radius: 8px;
  padding: 0.9rem 2rem; font-family: 'DM Sans', sans-serif;
  font-weight: 600; font-size: 0.95rem; cursor: pointer;
  display: inline-flex; align-items: center; gap: 0.5rem;
  transition: all 0.22s;
}
.so-btn-primary:hover {
  background: var(--gold-l); transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(232,160,32,0.28);
}
.so-btn-secondary {
  background: transparent; color: var(--text);
  border: 1px solid var(--border); border-radius: 8px;
  padding: 0.9rem 2rem; font-family: 'DM Sans', sans-serif;
  font-weight: 500; font-size: 0.95rem; cursor: pointer;
  display: inline-flex; align-items: center; gap: 0.5rem;
  transition: all 0.22s;
}
.so-btn-secondary:hover {
  border-color: rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.04);
}
.so-stats {
  display: flex; justify-content: center; align-items: center;
  gap: 3rem; flex-wrap: wrap;
  margin-top: 4rem; padding-top: 3.5rem;
  border-top: 1px solid var(--border);
}
.so-stat-num {
  font-family: 'Playfair Display', serif;
  font-size: 2.25rem; font-weight: 700; color: var(--gold);
  line-height: 1;
}
.so-stat-lbl {
  font-size: 0.72rem; color: var(--muted);
  letter-spacing: 0.08em; text-transform: uppercase;
  margin-top: 0.35rem;
}
.so-stat-div { width: 1px; height: 44px; background: var(--border); }

/* ── SECTION BASE ── */
.so-section { padding: 6rem 2.5rem; }
.so-inner { max-width: 1120px; margin: 0 auto; }
.so-lbl {
  font-size: 0.72rem; font-weight: 600; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--teal); margin-bottom: 1rem;
}
.so-h2 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(2rem, 4.5vw, 3.1rem);
  font-weight: 700; line-height: 1.15;
  color: var(--text); margin: 0 0 1.25rem;
}
.so-sub {
  font-size: 1rem; color: var(--muted);
  line-height: 1.75; max-width: 560px;
}

/* ── PROBLEM ── */
.so-problem { background: var(--n1); }
.so-pain-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem; margin-top: 3rem;
}
.so-pain-card {
  background: var(--n2); border: 1px solid var(--border);
  border-radius: 12px; padding: 1.5rem;
  transition: transform 0.28s, border-color 0.28s;
}
.so-pain-card:hover { transform: translateY(-4px); border-color: rgba(232,160,32,0.2); }
.so-pain-icon {
  width: 38px; height: 38px;
  background: rgba(255,90,90,0.1); border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 1rem; color: #ff6060;
}
.so-pain-title { font-weight: 600; font-size: 0.92rem; margin-bottom: 0.45rem; }
.so-pain-desc { font-size: 0.82rem; color: var(--muted); line-height: 1.6; }

/* ── SOLUTION FLOW ── */
.so-flow-bg { background: var(--n0); }
.so-flow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 1px; background: var(--border);
  border: 1px solid var(--border); border-radius: 16px;
  overflow: hidden; margin-top: 3rem;
}
.so-flow-item {
  background: var(--n1);
  padding: 1.75rem 1.25rem;
  text-align: center; transition: background 0.25s;
}
.so-flow-item:hover { background: var(--n2); }
.so-flow-icon {
  width: 44px; height: 44px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 0.875rem;
}
.so-flow-lbl { font-size: 0.8rem; font-weight: 600; margin-bottom: 0.3rem; }
.so-flow-desc { font-size: 0.73rem; color: var(--muted); line-height: 1.5; }

/* ── FEATURES ── */
.so-feat-bg { background: linear-gradient(180deg, var(--n0) 0%, var(--n1) 100%); }
.so-features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
  gap: 1.5rem; margin-top: 3rem;
}
.so-feat-card {
  background: var(--n2); border: 1px solid var(--border);
  border-radius: 16px; padding: 2rem; position: relative;
  overflow: hidden; transition: transform 0.28s, border-color 0.28s;
}
.so-feat-card::before {
  content: ''; position: absolute;
  top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent 10%, var(--gold) 50%, transparent 90%);
  opacity: 0; transition: opacity 0.3s;
}
.so-feat-card:hover { transform: translateY(-5px); border-color: rgba(232,160,32,0.22); }
.so-feat-card:hover::before { opacity: 1; }
.so-feat-icon {
  width: 48px; height: 48px;
  background: rgba(232,160,32,0.1); border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 1.25rem; color: var(--gold);
}
.so-feat-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem; font-weight: 500;
  color: var(--muted); margin-bottom: 0.6rem;
  letter-spacing: 0.12em;
}
.so-feat-title { font-weight: 600; font-size: 1.08rem; margin-bottom: 0.75rem; }
.so-feat-desc { font-size: 0.85rem; color: var(--muted); line-height: 1.65; }
.so-feat-items { list-style: none; margin: 1rem 0 0; padding: 0; }
.so-feat-items li {
  font-size: 0.8rem; color: var(--muted);
  padding: 0.28rem 0;
  display: flex; align-items: center; gap: 0.5rem;
}
.so-feat-items li::before {
  content: ''; display: block;
  width: 4px; height: 4px; border-radius: 50%;
  background: var(--gold); flex-shrink: 0;
}

/* ── TELEGRAM ── */
.so-tg-section {
  background: var(--n1);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.so-tg-inner {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 4rem; align-items: center;
}
.so-tg-check {
  display: flex; align-items: center; gap: 0.75rem;
  font-size: 0.875rem; color: var(--muted); margin-bottom: 0.65rem;
}
.so-chat-wrap {
  background: var(--n3); border: 1px solid var(--border);
  border-radius: 16px; padding: 1.5rem;
  font-family: 'JetBrains Mono', monospace; font-size: 0.78rem;
}
.so-chat-head {
  display: flex; align-items: center; gap: 0.75rem;
  padding-bottom: 1rem; border-bottom: 1px solid var(--border);
  margin-bottom: 1.25rem;
}
.so-chat-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--teal-d); display: flex; align-items: center;
  justify-content: center; font-size: 1rem;
}
.so-chat-name { font-weight: 600; font-size: 0.85rem; font-family: 'DM Sans', sans-serif; }
.so-chat-status { font-size: 0.72rem; color: var(--teal); font-family: 'DM Sans', sans-serif; }
.so-chat-msg { margin-bottom: 0.75rem; }
.so-chat-msg.user { text-align: right; }
.so-chat-bubble {
  display: inline-block; padding: 0.5rem 0.875rem;
  border-radius: 10px; line-height: 1.55; max-width: 88%;
  white-space: pre-line;
}
.so-chat-bubble.bot {
  background: var(--n4); color: var(--text);
  border-radius: 2px 10px 10px 10px;
}
.so-chat-bubble.user {
  background: var(--teal-d); color: #fff;
  border-radius: 10px 2px 10px 10px;
}
.so-chat-time { font-size: 0.62rem; color: var(--muted); margin-top: 0.2rem; }

/* ── ARCHITECTURE ── */
.so-arch-section { background: var(--n0); }
.so-arch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem; margin-top: 2.5rem;
}
.so-arch-card {
  background: var(--n2); border: 1px solid var(--border);
  border-radius: 12px; padding: 1.75rem;
  transition: transform 0.28s, border-color 0.28s;
}
.so-arch-card:hover { transform: translateY(-3px); }
.so-arch-icon {
  width: 44px; height: 44px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 1rem;
}
.so-arch-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.5rem; }
.so-arch-desc { font-size: 0.82rem; color: var(--muted); line-height: 1.6; }
.so-pills { display: flex; flex-wrap: wrap; gap: 0.65rem; margin-top: 2.25rem; }
.so-pill {
  background: var(--n3); border: 1px solid var(--border);
  border-radius: 100px; padding: 0.45rem 1.1rem;
  font-size: 0.78rem; font-weight: 500; color: var(--muted);
  display: flex; align-items: center; gap: 0.45rem; transition: all 0.2s;
  cursor: default;
}
.so-pill:hover { border-color: var(--gold); color: var(--gold); }
.so-pill-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

/* ── CTA ── */
.so-cta-section {
  padding: 6rem 2.5rem; text-align: center;
  background: radial-gradient(ellipse 65% 55% at 50% 50%, rgba(232,160,32,0.06) 0%, transparent 70%);
}
.so-cta-card {
  background: var(--n2); border: 1px solid rgba(232,160,32,0.18);
  border-radius: 24px; padding: 4.5rem 2.5rem;
  max-width: 720px; margin: 0 auto;
}
.so-cta-h2 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.8rem, 4vw, 2.9rem); font-weight: 700;
  margin: 0 0 1rem; line-height: 1.18;
}
.so-cta-sub { color: var(--muted); font-size: 1rem; margin-bottom: 2.25rem; }

/* ── FOOTER ── */
.so-footer {
  padding: 2rem 2.5rem; border-top: 1px solid var(--border);
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 1rem;
}
.so-footer-logo {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem; font-weight: 700; color: var(--text);
  margin: 0; /* Reset margins */
  display: flex; align-items: center;
}
.so-footer-logo em { color: var(--gold); font-style: normal; }
.so-footer-txt { 
  font-size: 0.875rem; color: var(--muted); 
  margin: 0; /* Clear default <p> margins for perfect vertical centering */
  display: flex; align-items: center;
}
.so-footer-links { 
  display: flex; gap: 1rem; align-items: center; 
  margin: 0; 
}
.so-footer-links a {
  font-size: 0.78rem; color: var(--muted);
  text-decoration: none; transition: color 0.2s;
}
.so-footer-links a:hover { color: var(--text); }

/* ── REVEAL ── */
.reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.6s ease, transform 0.6s ease; }
.reveal.visible { opacity: 1; transform: translateY(0); }
.rd1 { transition-delay: 0.1s; }
.rd2 { transition-delay: 0.2s; }
.rd3 { transition-delay: 0.3s; }
.rd4 { transition-delay: 0.4s; }

/* ── RESPONSIVE ── */
@media (max-width: 768px) {
  .so-links { display: none; }
  .so-tg-inner { grid-template-columns: 1fr; gap: 2.5rem; }
  .so-stat-div { display: none; }
  .so-stats { gap: 1.75rem; }
}
`;

// ─── Data ─────────────────────────────────────────────────
const FEATURES = [
  {
    id: "01", Icon: Users, title: "Guest Management",
    desc: "Comprehensive guest profiles with VIP flagging, corporate accounts, booking history, and Telegram chat integration.",
    items: ["Guest registration & profiles", "VIP & corporate support", "Booking history", "Telegram integration"]
  },
  {
    id: "02", Icon: Hotel, title: "Booking System",
    desc: "Automated room allocation engine with QR-based identification, confirmation emails, and full check-in/out lifecycle management.",
    items: ["Automated room allocation", "QR booking identification", "Email confirmations", "Check-in/out lifecycle"]
  },
  {
    id: "03", Icon: Settings, title: "Room Operations",
    desc: "Real-time occupancy tracking with live housekeeping status, maintenance coordination, and complete room activity logging.",
    items: ["Real-time occupancy", "Housekeeping status", "Maintenance tracking", "Activity logs"]
  },
  {
    id: "04", Icon: Car, title: "Parking Management",
    desc: "End-to-end parking slot allocation with vehicle tracking, operational status updates, and automated retrieval workflows.",
    items: ["Slot allocation system", "Vehicle tracking", "Status management", "Retrieval workflows"]
  },
  {
    id: "05", Icon: Package, title: "Luggage Handling",
    desc: "Full luggage tracking through check-in and check-out with delivery status management and staff assignment support.",
    items: ["Check-in/out tracking", "Delivery status", "Staff assignment", "Audit trail"]
  },
  {
    id: "06", Icon: MessageCircle, title: "Telegram Bot",
    desc: "Conversational guest self-service via slash command system with real-time operational status retrieval and automation.",
    items: ["Slash command system", "Guest self-service", "Real-time status", "Workflow automation"]
  }
];

const PAINS = [
  { title: "Delayed Guest Services", desc: "Manual coordination between departments causes unacceptable delays in fulfilling guest requests." },
  { title: "Poor Task Coordination", desc: "Disconnected systems mean staff have no unified operational view of pending tasks." },
  { title: "Zero Operational Visibility", desc: "Managers lack real-time insight into department activities and guest service states." },
  { title: "Fragmented Communication", desc: "Guest interactions scattered across calls and emails with no single source of truth." },
  { title: "Inefficient Asset Handling", desc: "Manual parking and luggage tracking leads to errors, delays, and poor guest experience." },
  { title: "Siloed Systems", desc: "Bookings, rooms, parking, and luggage systems operate entirely independently with no integration." }
];

const FLOW = [
  { Icon: CheckCircle, label: "Guest Arrives", desc: "Booking activates", color: "#e8a020", bg: "rgba(232,160,32,0.1)" },
  { Icon: Hotel, label: "Room Allocated", desc: "Auto-assigned", color: "#00c9a7", bg: "rgba(0,201,167,0.1)" },
  { Icon: Car, label: "Parking Assigned", desc: "Linked to booking", color: "#7b8cff", bg: "rgba(123,140,255,0.1)" },
  { Icon: Package, label: "Luggage Tracked", desc: "Porter notified", color: "#ff8c69", bg: "rgba(255,140,105,0.1)" },
  { Icon: MessageCircle, label: "Bot Activated", desc: "Guest self-service", color: "#00c9a7", bg: "rgba(0,201,167,0.1)" },
  { Icon: Activity, label: "Ops Dashboard", desc: "All live, one view", color: "#e8a020", bg: "rgba(232,160,32,0.1)" }
];

const TG_MSGS = [
  { type: "bot", text: "Welcome to Grand Meridian 🏨\nI'm your personal concierge bot.", time: "14:02" },
  { type: "user", text: "/check_in BOOK2847", time: "14:03" },
  { type: "bot", text: "✅ Check-in confirmed for #BOOK2847\n🏨 Room: 412 — Deluxe Suite\n🚗 Parking: Slot P-07\n🧳 Luggage: Porter assigned", time: "14:03" },
  { type: "user", text: "/room_status", time: "14:05" },
  { type: "bot", text: "📋 Room 412 Status\n• Housekeeping: ✅ Ready\n• Climate: 22°C set\n• Last serviced: 13:45", time: "14:05" }
];

const ARCH = [
  { Icon: Cpu, color: "#e8a020", bg: "rgba(232,160,32,0.1)", title: "Event-Driven Core", desc: "Operational state changes automatically cascade workflow actions across all departments — no manual steps." },
  { Icon: Shield, color: "#00c9a7", bg: "rgba(0,201,167,0.1)", title: "Role-Based Access", desc: "Multi-role authentication with department-wise access control for front desk, housekeeping, parking, and management." },
  { Icon: GitBranch, color: "#7b8cff", bg: "rgba(123,140,255,0.1)", title: "Automation-Ready", desc: "Architecture built for notifications, scheduled tasks, and third-party integrations from day one." },
  { Icon: Lock, color: "#ff8c69", bg: "rgba(255,140,105,0.1)", title: "Full-Stack Platform", desc: "React + Vite frontend with a scalable backend API, structured DB schema, and QR-based workflow entry points." }
];

const PILLS = [
  { label: "React + Vite", c: "#e8a020" },
  { label: "Bootstrap 5", c: "#7b8cff" },
  { label: "Event-Driven Architecture", c: "#00c9a7" },
  { label: "REST API", c: "#e8a020" },
  { label: "QR Code Workflows", c: "#ff8c69" },
  { label: "Telegram Bot API", c: "#00c9a7" },
  { label: "Role-Based Auth", c: "#7b8cff" },
  { label: "Real-Time Status Updates", c: "#e8a020" },
  { label: "Multi-Dept Coordination", c: "#ff8c69" }
];

// ─── Component ────────────────────────────────────────────
export default function StayHopsLanding() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Inject styles
    const style = document.createElement("style");
    style.id = "stayops-css";
    style.textContent = CSS;
    if (!document.getElementById("stayops-css")) document.head.appendChild(style);

    // Scroll nav
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", onScroll);

    // Reveal on scroll
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.08 }
    );
    const timer = setTimeout(() => {
      document.querySelectorAll(".reveal").forEach(el => io.observe(el));
    }, 80);

    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
      clearTimeout(timer);
      
      // 👇 ADD THIS TO REMOVE THE STYLES ON UNMOUNT
      const injectedStyle = document.getElementById("stayops-css");
      if (injectedStyle) {
        injectedStyle.remove();
      }
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh" }}>

      {/* ── NAVBAR ── */}
      <nav className={`so-nav${scrolled ? " scrolled" : ""}`}>
        <div className="so-logo">Stay<em>Hops</em> AI</div>
        <ul className="so-links">
          <li><a href="#problem">Problem</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#telegram">Telegram</a></li>
          <li><a href="#arch">Architecture</a></li>
        </ul>
        <button className="so-btn-cta" onClick={() => navigate("/demo")}>View Demo</button>
      </nav>

      {/* ── HERO ── */}
      <section className="so-hero" id="home">
        <div className="so-hero-bg" />
        <div className="so-hero-grid" />
        <div className="so-hero-content">
          <div className="so-badge">
            <span className="so-badge-dot" />
            Hospitality Operations Intelligence · v1.0
          </div>
          <h1 className="so-h1">
            Where Hospitality Meets<br />
            <span className="gold italic">Operational Intelligence</span>
          </h1>
          <p className="so-hero-sub">
            StayHops AI unifies guest bookings, room allocation, parking management, luggage handling,
            staff workflows, and Telegram-based guest communication into one event-driven platform.
          </p>
          <div className="so-ctas">
            <button className="so-btn-primary">
              Explore Platform <ArrowRight size={16} />
            </button>
            <button className="so-btn-secondary">
              View Architecture <GitBranch size={16} />
            </button>
          </div>
          <div className="so-stats">
            {[
              { num: "6", lbl: "Departments Connected" },
              null,
              { num: "100%", lbl: "Real-Time Tracking" },
              null,
              { num: "0", lbl: "Manual Coordination" },
              null,
              { num: "1", lbl: "Centralized Platform" }
            ].map((s, i) =>
              s === null
                ? <div key={i} className="so-stat-div" />
                : <div key={i}>
                    <div className="so-stat-num">{s.num}</div>
                    <div className="so-stat-lbl">{s.lbl}</div>
                  </div>
            )}
          </div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="so-section so-problem" id="problem">
        <div className="so-inner">
          <div className="reveal">
            <p className="so-lbl">The Problem</p>
            <h2 className="so-h2">The Coordination Crisis<br />in Hospitality</h2>
            <p className="so-sub">
              Traditional systems focus on bookings and billing — ignoring the operational chaos
              happening between departments every single day.
            </p>
          </div>
          <div className="so-pain-grid">
            {PAINS.map((p, i) => (
              <div key={i} className={`so-pain-card reveal rd${(i % 3) + 1}`}>
                <div className="so-pain-icon"><Zap size={18} /></div>
                <div className="so-pain-title">{p.title}</div>
                <div className="so-pain-desc">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUTION FLOW ── */}
      <section className="so-section so-flow-bg" id="solution">
        <div className="so-inner">
          <div className="reveal">
            <p className="so-lbl">The Solution</p>
            <h2 className="so-h2">One Platform.<br />Every Department. Real-Time.</h2>
            <p className="so-sub">
              An event-driven workflow where every operational action automatically triggers
              coordinated responses across all departments.
            </p>
          </div>
          <div className="so-flow-grid reveal">
            {FLOW.map(({ Icon, label, desc, color, bg }, i) => (
              <div key={i} className="so-flow-item">
                <div className="so-flow-icon" style={{ background: bg }}>
                  <Icon size={20} color={color} />
                </div>
                <div className="so-flow-lbl" style={{ color }}>{label}</div>
                <div className="so-flow-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="so-section so-feat-bg" id="features">
        <div className="so-inner">
          <div className="reveal">
            <p className="so-lbl">Core Modules</p>
            <h2 className="so-h2">Everything Operations Needs</h2>
            <p className="so-sub">
              Six integrated modules covering every dimension of hotel operations,
              from guest registration to real-time department coordination.
            </p>
          </div>
          <div className="so-features-grid">
            {FEATURES.map(({ id, Icon, title, desc, items }, i) => (
              <div key={i} className={`so-feat-card reveal rd${(i % 3) + 1}`}>
                <div className="so-feat-num">{id} —</div>
                <div className="so-feat-icon"><Icon size={22} /></div>
                <div className="so-feat-title">{title}</div>
                <div className="so-feat-desc">{desc}</div>
                <ul className="so-feat-items">
                  {items.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TELEGRAM ── */}
      <section className="so-section so-tg-section" id="telegram">
        <div className="so-inner">
          <div className="so-tg-inner">
            <div className="reveal">
              <p className="so-lbl">Telegram Integration</p>
              <h2 className="so-h2">Guests Talk.<br />The Platform Listens.</h2>
              <p style={{ color: "var(--muted)", lineHeight: 1.75, marginBottom: "1.75rem", fontSize: "1rem" }}>
                A fully operational Telegram bot connects guests directly to hospitality workflows.
                Check in, track rooms, and request services — all via conversational slash commands.
              </p>
              {["/check_in — Activate booking & receive room details",
                "/room_status — Real-time housekeeping & climate status",
                "/parking — Request vehicle retrieval",
                "/request — Submit room service requests"].map((cmd, i) => (
                <div key={i} className="so-tg-check">
                  <CheckCircle size={16} color="var(--teal)" style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem" }}>{cmd}</span>
                </div>
              ))}
            </div>

            <div className="reveal rd2">
              <div className="so-chat-wrap">
                <div className="so-chat-head">
                  <div className="so-chat-avatar">🏨</div>
                  <div>
                    <div className="so-chat-name">Grand Meridian Bot</div>
                    <div className="so-chat-status">● Online</div>
                  </div>
                </div>
                {TG_MSGS.map((msg, i) => (
                  <div key={i} className={`so-chat-msg ${msg.type}`}>
                    <div className={`so-chat-bubble ${msg.type}`}>{msg.text}</div>
                    <div className="so-chat-time">{msg.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section className="so-section so-arch-section" id="arch">
        <div className="so-inner">
          <div className="reveal">
            <p className="so-lbl">Architecture</p>
            <h2 className="so-h2">Built to Scale</h2>
            <p className="so-sub">
              An event-driven backend where operational status updates cascade automatically
              through workflow chains — no manual intervention required.
            </p>
          </div>
          <div className="so-arch-grid">
            {ARCH.map(({ Icon, color, bg, title, desc }, i) => (
              <div key={i} className={`so-arch-card reveal rd${i + 1}`} style={{ borderColor: `${color}20` }}>
                <div className="so-arch-icon" style={{ background: bg, color }}>
                  <Icon size={22} />
                </div>
                <div className="so-arch-title">{title}</div>
                <div className="so-arch-desc">{desc}</div>
              </div>
            ))}
          </div>
          <div className="so-pills reveal">
            {PILLS.map(({ label, c }, i) => (
              <div key={i} className="so-pill">
                <span className="so-pill-dot" style={{ background: c }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="so-cta-section">
        <div className="so-cta-card reveal">
          <p className="so-lbl" style={{ marginBottom: "1rem" }}>Get Started</p>
          <h2 className="so-cta-h2">Ready to Unify Your<br />Hotel Operations?</h2>
          <p className="so-cta-sub">
            StayHops AI is built for real-world hospitality workflows with scalable,
            event-driven architecture designed for the future.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button className="so-btn-primary" onClick={() => navigate("/demo")}>
              View Demo <ArrowRight size={16} />
            </button>
            <a
              className="so-btn-secondary"
              href="https://github.com/yaswanthkillampalli/stayhopsai"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub <GitBranch size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="so-footer">
        <div className="so-footer-logo">Stay<em>Hops</em> AI</div>
        <p className="so-footer-txt">Hospitality Operations Intelligence Platform</p>
        <div className="so-footer-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#telegram">Telegram</a>
          <a href="#arch">Architecture</a>
        </div>
        <p className="so-footer-txt">© 2025 StayHops AI · Built with React + Vite</p>
      </footer>
    </div>
  );
}