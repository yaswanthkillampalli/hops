import { useEffect, useMemo, useState } from "react";
import { getAnalyticsMetrics, getBookings, getComplaints, getMaintenance, getRevenue } from "../api";
import "../styles/Analytics.css"; // Ensure this matches your CSS path

function MetricCard({ label, value, subtitle, color = "primary" }) {
  return (
    <div className="col-md-3 col-sm-6">
      <div className={`metric-card metric-card-${color}`}>
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value ?? 0}</div>
        {subtitle ? <div className="metric-subtitle">{subtitle}</div> : null}
      </div>
    </div>
  );
}

function SectionCard({ title, children, action }) {
  return (
    <div className="modern-card h-100">
      <div className="modern-card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{title}</h5>
        {action}
      </div>
      <div className="modern-card-body bg-light">{children}</div>
    </div>
  );
}

function BarList({ items, valueKey = "count", labelKey = "label", color = "primary", emptyText = "No data available" }) {
  const max = Math.max(...items.map((item) => Number(item?.[valueKey] ?? 0)), 1);

  if (!items || items.length === 0) {
    return <div className="text-muted small py-2">{emptyText}</div>;
  }

  return (
    <div className="d-grid gap-3">
      {items.map((item) => {
        const value = Number(item?.[valueKey] ?? 0);
        const width = Math.max((value / max) * 100, 2); // At least 2% to show the bar
        return (
          <div key={String(item?.[labelKey] ?? item?._id ?? item?.date ?? item?.month)}>
            <div className="d-flex justify-content-between small mb-1 align-items-end">
              <span className="text-capitalize fw-medium text-dark">{String(item?.[labelKey] ?? item?._id ?? "N/A")}</span>
              <strong className="text-dark">{value}</strong>
            </div>
            <div className="modern-progress">
              <div className={`modern-progress-bar bg-gradient-${color}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimelineBars({ items, labelKey = "date", valueKey = "revenue", color = "primary" }) {
  const max = Math.max(...items.map((item) => Number(item?.[valueKey] ?? 0)), 1);

  if (!items || items.length === 0) {
    return <div className="text-muted small py-2">No trend data available</div>;
  }

  return (
    <div className="timeline-chart">
      {items.map((item) => {
        const value = Number(item?.[valueKey] ?? 0);
        const height = Math.max((value / max) * 100, 5); // Percentage height
        return (
          <div key={String(item?.[labelKey] ?? item?._id ?? Math.random())} className="timeline-col">
            <div className="timeline-bar-container" title={String(value)}>
              <div className={`timeline-bar-fill bg-gradient-${color}`} style={{ height: `${height}%` }} />
            </div>
            <div className="timeline-label">{String(item?.[labelKey] ?? item?.month ?? item?.date ?? "N/A")}</div>
          </div>
        );
      })}
    </div>
  );
}

function getCount(items, key) {
  return (items || []).reduce((total, item) => total + Number(item?.count ?? item?.value ?? 0), 0);
}

function normalize(items, labelKey = "_id") {
  return (items || []).map((item) => ({
    label: item?.[labelKey] ?? item?.label ?? item?.value ?? "N/A",
    count: item?.count ?? item?.total ?? item?.revenue ?? 0,
    ...item,
  }));
}

export default function Analytics() {
  const [metrics, setMetrics] = useState(null);
  const [revenueOnly, setRevenueOnly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [metricsRes, revenueRes, bookingsRes, complaintsRes, maintenanceRes] = await Promise.allSettled([
          getAnalyticsMetrics(),
          getRevenue(),
          getBookings({ limit: 100 }),
          getComplaints({ limit: 100 }),
          getMaintenance({ limit: 100 }),
        ]);

        if (!mounted) return;

        if (metricsRes.status === "fulfilled") {
          setMetrics(metricsRes.value.data?.data || {});
        } else {
          throw metricsRes.reason;
        }

        if (revenueRes.status === "fulfilled") {
          setRevenueOnly(revenueRes.value.data?.data?.revenue || revenueRes.value.data?.revenue || null);
        }

        const bookings = bookingsRes.status === "fulfilled" ? bookingsRes.value.data?.bookings || bookingsRes.value.data?.data?.bookings || {} : {};
        const complaintsSummary = complaintsRes.status === "fulfilled" ? complaintsRes.value.data?.complaints || complaintsRes.value.data?.data?.complaints || {} : {};
        const maintenanceSummary = maintenanceRes.status === "fulfilled" ? maintenanceRes.value.data?.maintenanceRequests || maintenanceRes.value.data?.data?.maintenanceRequests || {} : {};

        setMetrics((prev) => ({
          ...(prev || {}),
          bookings,
          complaintsSummary,
          maintenanceSummary,
        }));
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  const exportPayload = useMemo(() => ({
    generatedAt: new Date().toISOString(),
    ...metrics,
    revenueOnly,
  }), [metrics, revenueOnly]);

  function downloadExport() {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const revenue = metrics?.revenue || revenueOnly || {};
  const bookings = metrics?.bookings || {};
  const guests = metrics?.guests || {};
  const rooms = metrics?.rooms || {};
  const tasks = metrics?.tasks || {};
  const complaints = metrics?.complaints || {};
  const maintenance = metrics?.maintenance || {};
  const luggage = metrics?.luggage || {};
  const foodOrders = metrics?.foodOrders || {};

  const occupancyRate = rooms.totalRooms ? Math.round(((rooms.occupiedRooms || 0) / rooms.totalRooms) * 100) : 0;
  const bookingCompletionRate = bookings.totalBookings ? Math.round(((bookings.bookingsThisMonth || 0) / bookings.totalBookings) * 100) : 0;
  const taskCompletionRate = tasks.totalTasks ? Math.round(((tasks.completedTasks || 0) / tasks.totalTasks) * 100) : 0;
  const complaintResolutionRate = complaints.totalComplaints ? Math.round(((complaints.resolvedComplaints || 0) / complaints.totalComplaints) * 100) : 0;
  const maintenanceResolutionRate = maintenance.totalRequests ? Math.round(((maintenance.resolvedRequests || 0) / maintenance.totalRequests) * 100) : 0;

  const guestTypes = normalize(guests.guestTypes);
  const roomTypes = normalize(rooms.roomTypes);
  const floorDistribution = normalize(rooms.floorDistribution);
  const taskStatuses = normalize(tasks.byStatus);
  const taskPriorities = normalize(tasks.byPriority);
  const complaintStatuses = normalize(complaints.byStatus);
  const complaintSeverity = normalize(complaints.bySeverity);
  const maintenanceStatuses = normalize(maintenance.byStatus);
  const luggageStatus = normalize(luggage.byOverallStatus);
  const foodMealTypes = normalize(foodOrders.byMealType);
  const paymentBreakdown = normalize(revenue.paymentBreakdown, "label");

  const byDayRevenue = revenue.revenueByDay || [];
  const byMonthRevenue = revenue.revenueByMonth || [];

  return (
    <div className="analytics-page p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="mb-1 fw-bold">Analytics & Reports</h2>
          <div className="text-muted">Deep-dive analytics across every operational domain. All data is read-only.</div>
        </div>
        <div className="d-flex gap-2">
          <button className="modern-btn modern-btn-outline" onClick={downloadExport} disabled={loading || !metrics}>
            Export JSON Data
          </button>
        </div>
      </div>

      {error && <div className="modern-alert modern-alert-danger">{error}</div>}
      {loading && <div className="modern-alert modern-alert-info">Crunching the numbers...</div>}

      <div className="row g-4 mb-4">
        <MetricCard label="Total Bookings" value={bookings.totalBookings} color="primary" subtitle={`This month: ${bookings.bookingsThisMonth || 0}`} />
        <MetricCard label="Occupancy Rate" value={`${occupancyRate}%`} color="success" subtitle={`Occupied rooms: ${rooms.occupiedRooms || 0}`} />
        <MetricCard label="Total Guests" value={guests.totalGuests} color="info" subtitle={`Repeat guests: ${guests.repeatGuests || 0}`} />
        <MetricCard label="Open Tasks" value={tasks.totalTasks ? (tasks.totalTasks - (tasks.completedTasks || 0)) : 0} color="warning" subtitle={`Completed rate: ${taskCompletionRate}%`} />
        <MetricCard label="Open Complaints" value={complaints.openComplaints} color="danger" subtitle={`Urgent: ${complaints.urgentComplaints || 0}`} />
        <MetricCard label="Open Maintenance" value={maintenance.openRequests} color="dark" subtitle={`Resolved rate: ${maintenanceResolutionRate}%`} />
        <MetricCard label="Luggage Pieces" value={luggage.luggagePieces} color="secondary" subtitle={`Batches: ${luggage.totalBatches || 0}`} />
        <MetricCard label="Food Orders" value={foodOrders.totalOrders} color="primary" subtitle={`Today: ${foodOrders.ordersToday || 0}`} />
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-6">
          <SectionCard title="Revenue Breakdown" action={<span className="modern-badge badge-primary">Finance</span>}>
            <div className="row g-3 mb-4 pb-3 border-bottom">
              <MetricCard label="Paid" value={`$${revenue.paidRevenue || 0}`} color="success" />
              <MetricCard label="Pending" value={`$${revenue.pendingRevenue || 0}`} color="warning" />
              <MetricCard label="Refunded" value={`$${revenue.refundedRevenue || 0}`} color="danger" />
              <MetricCard label="Avg. Fulfillment" value={`${foodOrders.averageFulfillmentMinutes || 0}m`} color="info" />
            </div>
            <div className="mb-4">
              <div className="section-subtitle">Payment method / status</div>
              <BarList items={paymentBreakdown.map((item) => ({ label: item.label || item.value, count: item.count }))} color="primary" />
            </div>
            <div className="mb-4">
              <div className="section-subtitle">Revenue by day</div>
              <TimelineBars items={byDayRevenue} labelKey="date" valueKey="revenue" color="success" />
            </div>
            <div>
              <div className="section-subtitle">Revenue by month</div>
              <TimelineBars items={byMonthRevenue} labelKey="month" valueKey="revenue" color="primary" />
            </div>
          </SectionCard>
        </div>

        <div className="col-12 col-xl-6">
          <SectionCard title="Occupancy & Bookings" action={<span className="modern-badge badge-success">Front Desk</span>}>
            <div className="row g-3 mb-4 pb-3 border-bottom">
              <MetricCard label="Booked Today" value={bookings.bookingsToday} color="primary" />
              <MetricCard label="Booked This Week" value={bookings.bookingsThisWeek} color="info" />
              <MetricCard label="Booked This Month" value={bookings.bookingsThisMonth} color="success" />
              <MetricCard label="Occupancy Trend" value={`${bookingCompletionRate}%`} color="warning" subtitle="Bookings this month / total" />
            </div>
            <div className="mb-4">
              <div className="section-subtitle">Booking trend (14 days)</div>
              <TimelineBars items={bookings.bookingsByDay || []} labelKey="date" valueKey="count" color="success" />
            </div>
            <div className="mb-4">
              <div className="section-subtitle">Rooms by type</div>
              <BarList items={roomTypes} color="dark" />
            </div>
            <div>
              <div className="section-subtitle">Floor distribution</div>
              <BarList items={floorDistribution} color="warning" />
            </div>
          </SectionCard>
        </div>

        <div className="col-12 col-xl-4">
          <SectionCard title="Guest Metrics" action={<span className="modern-badge badge-info">CRM</span>}>
            <div className="row g-3 mb-4 pb-3 border-bottom">
              <MetricCard label="Total Guests" value={guests.totalGuests} color="info" />
              <MetricCard label="Repeat Guests" value={guests.repeatGuests} color="success" />
              <MetricCard label="VIP Guests" value={guests.vipGuests} color="warning" />
              <MetricCard label="Telegram Linked" value={guests.telegramConnectedGuests} color="primary" />
            </div>
            <div className="mb-4">
              <div className="section-subtitle">Guest demographics</div>
              <BarList items={guestTypes} color="info" />
            </div>
            <div className="p-3 bg-white border rounded-3 text-dark small fw-medium lh-lg">
              <div className="d-flex justify-content-between border-bottom pb-1 mb-1"><span>Checked-in guests:</span> <strong>{guests.checkedInGuests || 0}</strong></div>
              <div className="d-flex justify-content-between border-bottom pb-1 mb-1"><span>Corporate guests:</span> <strong>{guests.corporateGuests || 0}</strong></div>
              <div className="d-flex justify-content-between border-bottom pb-1 mb-1"><span>Guests with parking:</span> <strong>{guests.guestsWithParking || 0}</strong></div>
              <div className="d-flex justify-content-between"><span>With special requests:</span> <strong>{guests.guestsWithSpecialRequests || 0}</strong></div>
            </div>
          </SectionCard>
        </div>

        <div className="col-12 col-xl-4">
          <SectionCard title="Operations Scorecard" action={<span className="modern-badge badge-warning">Engineering</span>}>
            <div className="row g-3 mb-4 pb-3 border-bottom">
              <MetricCard label="Tasks Completed" value={tasks.completedTasks} color="success" />
              <MetricCard label="Task Comp. Rate" value={`${taskCompletionRate}%`} color="primary" />
              <MetricCard label="Urgent Complaints" value={complaints.urgentComplaints} color="danger" />
              <MetricCard label="Maint. Avg. Res." value={`${maintenance.averageResolutionMinutes || 0}m`} color="dark" />
            </div>
            <div className="mb-4">
              <div className="section-subtitle">Task status</div>
              <BarList items={taskStatuses} color="success" />
            </div>
            <div className="mb-4">
              <div className="section-subtitle">Task priority</div>
              <BarList items={taskPriorities} color="warning" />
            </div>
            <div className="mb-4">
              <div className="section-subtitle">Complaint severity</div>
              <BarList items={complaintSeverity} color="danger" />
            </div>
            <div className="p-3 bg-white border rounded-3 text-dark small fw-medium lh-lg">
              <div className="d-flex justify-content-between border-bottom pb-1 mb-1"><span className="text-danger">Open complaints:</span> <strong>{complaints.openComplaints || 0}</strong></div>
              <div className="d-flex justify-content-between border-bottom pb-1 mb-1"><span className="text-warning">Open maintenance:</span> <strong>{maintenance.openRequests || 0}</strong></div>
              <div className="d-flex justify-content-between"><span className="text-dark">Overdue tasks:</span> <strong>{tasks.overdueTasks || 0}</strong></div>
            </div>
          </SectionCard>
        </div>

        <div className="col-12 col-xl-4">
          <SectionCard title="Ancillary Services" action={<span className="modern-badge badge-secondary">Services</span>}>
            <div className="row g-3 mb-4 pb-3 border-bottom">
              <MetricCard label="Luggage Batches" value={luggage.totalBatches} color="secondary" />
              <MetricCard label="Delivered Batches" value={luggage.deliveredBatches} color="success" />
              <MetricCard label="Food Orders" value={foodOrders.totalOrders} color="primary" />
              <MetricCard label="Completed Orders" value={foodOrders.completedOrders} color="success" />
            </div>
            <div className="mb-4">
              <div className="section-subtitle">Luggage status</div>
              <BarList items={luggageStatus} color="secondary" />
            </div>
            <div className="mb-4">
              <div className="section-subtitle">Food orders by meal type</div>
              <BarList items={foodMealTypes} color="primary" />
            </div>
            <div className="p-3 bg-white border rounded-3 text-dark small fw-medium lh-lg">
              <div className="d-flex justify-content-between border-bottom pb-1 mb-1"><span>Avg. luggage delivery:</span> <strong>{luggage.averageDeliveryMinutes || 0}m</strong></div>
              <div className="d-flex justify-content-between"><span>Avg. food fulfillment:</span> <strong>{foodOrders.averageFulfillmentMinutes || 0}m</strong></div>
            </div>
          </SectionCard>

          <div className="mt-4">
            <SectionCard title="Export Tools" action={<span className="modern-badge badge-dark">Data</span>}>
              <div className="mb-3">
                <p className="small text-muted mb-2">Full export payload is ready for external reporting tools (PDF / CSV generation).</p>
                <div className="d-flex flex-wrap gap-2 mt-3">
                  {["overview", "bookings", "guests", "rooms", "tasks", "complaints", "maintenance", "parking", "luggage", "foodOrders", "staff", "revenue"].map(domain => (
                    <span key={domain} className="modern-badge badge-secondary text-lowercase fw-normal">{domain}</span>
                  ))}
                </div>
              </div>
              <button className="modern-btn modern-btn-dark w-100 mt-2" onClick={downloadExport} disabled={loading || !metrics}>
                Download Snapshot (.json)
              </button>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}