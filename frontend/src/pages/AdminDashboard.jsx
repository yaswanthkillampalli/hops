import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getOverview,
  getBookings,
  getRevenue,
  getOpenTasks,
  getComplaintsList,
  getMaintenanceList,
} from "../api";
import "../styles/AdminDashboard.css";

/* ── helpers ── */
function unwrapPayload(response, key, fallback) {
  return response?.data?.data?.[key] ?? response?.data?.[key] ?? fallback;
}

function getLatestRevenue(revenueByDay) {
  if (!Array.isArray(revenueByDay) || revenueByDay.length === 0) return 0;
  return revenueByDay[revenueByDay.length - 1]?.revenue ?? 0;
}

/* ─────────────────────────────────────────────
   KPI GRID
───────────────────────────────────────────── */
function KPIGrid({ data }) {
  const items = [
    { label: "Total Bookings",    value: data.totalBookings ?? 0,          icon: "🛎️" },
    { label: "Occupancy %",       value: `${data.occupancyPercent ?? 0}%`, icon: "🏨" },
    { label: "Open Tasks",        value: data.openTasks ?? 0,              icon: "📋" },
    { label: "Active Complaints", value: data.activeComplaints ?? 0,       icon: "⚠️" },
    { label: "Revenue Today",     value: `$${data.revenueToday ?? 0}`,     icon: "💰" },
  ];

  return (
    <div className="row g-3">
      {items.map(({ label, value, icon }) => (
        <div key={label} className="col-6 col-md-4 col-lg">
          <div className="kpi-card">
            <span className="kpi-icon">{icon}</span>
            <span className="kpi-label">{label}</span>
            <span className="kpi-value">{value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   BOOKING TREND CHART
───────────────────────────────────────────── */
function BookingTrendChart({ bookingsByDay }) {
  if (!bookingsByDay || bookingsByDay.length === 0) {
    return (
      <div className="dash-card">
        <p className="dash-card__title">7-day Check-in / Check-out</p>
        <p className="dash-empty">No booking data available</p>
      </div>
    );
  }

  const last7  = bookingsByDay.slice(-7);
  const counts = last7.map((b) => b.count || 0);
  const max    = Math.max(...counts, 1);

  return (
    <div className="dash-card">
      <p className="dash-card__title">7-day Check-in / Check-out</p>
      <div className="bar-chart">
        {counts.map((c, i) => (
          <div key={i} className="bar-chart__col">
            <div
              className="bar-chart__bar"
              style={{ height: `${(c / max) * 100}%` }}
              title={`${c} bookings`}
            />
            <span className="bar-chart__label">
              {last7[i].date
                ? new Date(last7[i].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                : new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   REVENUE SUMMARY
───────────────────────────────────────────── */
function RevenueSummary({ revenue }) {
  if (!revenue || Object.keys(revenue).length === 0) {
    return (
      <div className="dash-card">
        <p className="dash-card__title">Revenue Summary</p>
        <p className="dash-empty">No revenue data available</p>
      </div>
    );
  }

  const { paid = 0, pending = 0, refunded = 0 } = revenue;

  return (
    <div className="dash-card">
      <p className="dash-card__title">Revenue Summary</p>
      <div className="revenue-grid">
        <div className="revenue-item">
          <span className="revenue-item__label">Paid</span>
          <span className="revenue-item__value revenue-item__value--paid">${paid}</span>
        </div>
        <div className="revenue-item">
          <span className="revenue-item__label">Pending</span>
          <span className="revenue-item__value revenue-item__value--pending">${pending}</span>
        </div>
        <div className="revenue-item">
          <span className="revenue-item__label">Refunded</span>
          <span className="revenue-item__value revenue-item__value--refunded">${refunded}</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   RECENT ACTIVITY
───────────────────────────────────────────── */
const TYPE_MOD = { Task: "task", Complaint: "complaint", Maintenance: "maintenance" };

function RecentActivity({ items }) {
  return (
    <div className="dash-card dash-card--activity">
      <p className="dash-card__title">Recent Activity</p>
      {items.length === 0 ? (
        <p className="dash-empty">No recent activity</p>
      ) : (
        <ul className="activity-list">
          {items.map((it, idx) => (
            <li key={idx} className="activity-item">
              <span className={`activity-item__badge activity-item__badge--${TYPE_MOD[it.type] ?? "task"}`}>
                {it.type}
              </span>
              <span className="activity-item__time">
                {new Date(it.createdAt || it.date || Date.now()).toLocaleString()}
              </span>
              <span className="activity-item__summary">
                {it.summary || it.title || it.description || "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   QUICK ACTIONS
───────────────────────────────────────────── */
function QuickActions() {
  const navigate = useNavigate();
  return (
    <div className="quick-actions">
      <button className="qa-btn qa-btn--primary"   onClick={() => navigate("/admin/bookings")}>
        + Create Booking
      </button>
      <button className="qa-btn qa-btn--secondary" onClick={() => navigate("/admin/rooms")}>
        Scan Check-in
      </button>
      <button className="qa-btn qa-btn--warning"   onClick={() => navigate("/admin/complaints")}>
        Raise Complaint
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LOADING SKELETON
───────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="skeleton-wrap">
      <div className="row g-3 mb-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="col-6 col-md-4 col-lg">
            <div className="skeleton skeleton--card" />
          </div>
        ))}
      </div>
      <div className="row g-3">
        <div className="col-md-8"><div className="skeleton skeleton--chart" /></div>
        <div className="col-md-4">
          <div className="skeleton skeleton--revenue" />
          <div className="skeleton skeleton--activity" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */
export default function AdminDashboard() {
  const [overview,      setOverview]      = useState({});
  const [bookingsByDay, setBookingsByDay] = useState([]);
  const [revenue,       setRevenue]       = useState({});
  const [revenueToday,  setRevenueToday]  = useState(0);
  const [activities,    setActivities]    = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const [ovRes, bkRes, rvRes, tasksRes, compRes, maintRes] =
          await Promise.allSettled([
            getOverview(),
            getBookings({ limit: 100 }),
            getRevenue(),
            getOpenTasks(),
            getComplaintsList(),
            getMaintenanceList(),
          ]);

        if (!mounted) return;

        if (ovRes.status === "fulfilled")
          setOverview(unwrapPayload(ovRes.value, "overview", {}));

        if (bkRes.status === "fulfilled") {
          const bm = unwrapPayload(bkRes.value, "bookings", {});
          setBookingsByDay(bm.bookingsByDay || []);
        }

        if (rvRes.status === "fulfilled") {
          const rd = unwrapPayload(rvRes.value, "revenue", {});
          const rbd = Array.isArray(rd.revenueByDay) ? rd.revenueByDay : [];
          setRevenue({
            paid:     rd.paidRevenue     || 0,
            pending:  rd.pendingRevenue  || 0,
            refunded: rd.refundedRevenue || 0,
          });
          setRevenueToday(getLatestRevenue(rbd));
        }

        const tasks = tasksRes.status === "fulfilled" ? unwrapPayload(tasksRes.value, "tasks", [])                         : [];
        const comps = compRes.status  === "fulfilled" ? unwrapPayload(compRes.value,  "complaints", [])                    : [];
        const maint = maintRes.status === "fulfilled" ? unwrapPayload(maintRes.value, "maintenanceRequests", [])           : [];

        const combined = [
          ...tasks.map((t) => ({ ...t, type: "Task",        summary: t.title       || t.summary     })),
          ...comps.map((c) => ({ ...c, type: "Complaint",   summary: c.subject     || c.description })),
          ...maint.map((m) => ({ ...m, type: "Maintenance", summary: m.title       || m.description })),
        ]
          .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
          .slice(0, 10);

        setActivities(combined);
      } catch (_) {
        /* individual promises handle their own errors */
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="dash-page">
      <div className="container-fluid px-4 py-4">

        {/* ── Header ── */}
        <div className="dash-header">
          <div>
            <h2 className="dash-heading">Dashboard</h2>
            <p className="dash-subheading">Welcome back — here's what's happening today.</p>
          </div>
          <QuickActions />
        </div>

        {/* ── Body ── */}
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* KPIs */}
            <KPIGrid data={{
              totalBookings:    overview.registeredBookings ?? overview.activeBookings ?? 0,
              occupancyPercent: (overview.roomOccupancyRate || 0).toFixed(1),
              openTasks:        overview.openTasks    || 0,
              activeComplaints: overview.openComplaints || 0,
              revenueToday,
            }} />

            {/* Charts row */}
            <div className="row g-3 mt-1">
              <div className="col-md-8">
                <BookingTrendChart bookingsByDay={bookingsByDay} />
              </div>
              <div className="col-md-4">
                <RevenueSummary revenue={revenue} />
                <RecentActivity items={activities} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}