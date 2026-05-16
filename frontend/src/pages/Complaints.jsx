import { useEffect, useMemo, useState } from "react";
import {
  createComplaint,
  getComplaintsByBooking,
  getComplaintsList,
  resolveComplaint,
} from "../api";
import "../styles/Complaints.css"; // Ensure this matches your path

const categoryOptions = ["service", "housekeeping", "maintenance", "food", "parking", "billing", "other"];
const severityOptions = ["low", "medium", "high", "urgent"];
const statusOptions = ["open", "assigned", "in_progress", "resolved", "closed", "cancelled"];

const severityClassMap = {
  low: "severity-low",
  medium: "severity-medium",
  high: "severity-high",
  urgent: "severity-urgent",
};

const badgeColorMap = {
  low: "badge-info",
  medium: "badge-warning",
  high: "badge-danger",
  urgent: "badge-danger",
  open: "badge-danger",
  assigned: "badge-warning",
  in_progress: "badge-info",
  resolved: "badge-success",
  closed: "badge-secondary",
  cancelled: "badge-dark",
};

function ComplaintCard({ complaint, selected, onClick }) {
  const sevClass = severityClassMap[complaint.severity] || severityClassMap.medium;
  const selClass = selected ? "complaint-card--selected" : "";

  return (
    <div className={`complaint-card ${sevClass} ${selClass}`} onClick={onClick}>
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h6 className="mb-1 fw-bold text-dark" style={{ fontSize: '1rem' }}>{complaint.title}</h6>
          <div className="small text-muted font-monospace">{complaint.complaintId.slice(-8)}</div>
        </div>
        <div className="d-flex gap-2 flex-wrap justify-content-end">
          <span className={`modern-badge ${badgeColorMap[complaint.status]}`}>{complaint.status}</span>
          <span className={`modern-badge ${badgeColorMap[complaint.severity]}`}>{complaint.severity}</span>
        </div>
      </div>
      <div className="d-flex justify-content-between align-items-end mt-3">
        <div className="small fw-medium text-dark">
          {complaint.guestName || "N/A"} <span className="text-muted mx-1">•</span> Room {complaint.roomNumber || "N/A"}
        </div>
        <div className="small text-muted text-capitalize">
          {complaint.category}
        </div>
      </div>
    </div>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="detail-line">
      <div className="detail-line-label">{label}</div>
      <div className="detail-line-value">{value || "N/A"}</div>
    </div>
  );
}

function normalizeComplaint(complaint) {
  return {
    ...complaint,
    complaintId: complaint.complaintId || complaint._id,
    guestName: complaint.guestId?.fullName || complaint.guestName || "N/A",
    guestPhone: complaint.guestId?.phone || complaint.guestPhone || "N/A",
    assignedToName: complaint.assignedTo?.fullName || complaint.assignedToName || "Unassigned",
  };
}

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBookingId, setFilterBookingId] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState("all");
  
  const [createForm, setCreateForm] = useState({
    bookingId: "", roomNumber: "", category: "service", severity: "medium", title: "", description: "", source: "http", notes: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [resolveForm, setResolveForm] = useState({ resolutionNotes: "" });
  const [resolveLoading, setResolveLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  async function loadComplaints(useBookingId = "") {
    setLoading(true); setError(""); setDetailError("");
    try {
      let data = [];
      if (useBookingId || filterBookingId) {
        const res = await getComplaintsByBooking(useBookingId || filterBookingId);
        data = res.data?.complaints || [];
      } else {
        const res = await getComplaintsList();
        data = res.data?.complaints || [];
      }
      setComplaints(data.map(normalizeComplaint));
    } catch (err) { setError(err.response?.data?.message || err.message || "Failed to load complaints"); } finally { setLoading(false); }
  }

  useEffect(() => { loadComplaints(); }, [viewMode, filterBookingId]);

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    const next = complaints.filter((complaint) => {
      const matchesSearch = !term || [complaint.complaintId, complaint.title, complaint.description, complaint.guestName, complaint.category]
          .filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
      const matchesSeverity = !severityFilter || complaint.severity === severityFilter;
      const matchesStatus = !statusFilter || complaint.status === statusFilter;
      const matchesCategory = !categoryFilter || complaint.category === categoryFilter;
      return matchesSearch && matchesSeverity && matchesStatus && matchesCategory;
    });
    setFilteredComplaints(next);
  }, [complaints, searchTerm, severityFilter, statusFilter, categoryFilter]);

  async function handleCreateComplaint(e) {
    e.preventDefault(); setCreateLoading(true); setError("");
    try {
      await createComplaint(createForm);
      setCreateForm({ bookingId: "", roomNumber: "", category: "service", severity: "medium", title: "", description: "", source: "http", notes: "" });
      await loadComplaints();
    } catch (err) { setError(err.response?.data?.message || err.message || "Failed to create complaint"); } finally { setCreateLoading(false); }
  }

  async function handleResolveComplaint(e) {
    e.preventDefault(); if (!selectedComplaint) return;
    setResolveLoading(true); setDetailError("");
    try {
      await resolveComplaint(selectedComplaint.complaintId, resolveForm.resolutionNotes);
      setResolveForm({ resolutionNotes: "" });
      await loadComplaints();
      setSelectedComplaint(null);
    } catch (err) { setDetailError(err.response?.data?.message || err.message || "Failed to resolve complaint"); } finally { setResolveLoading(false); }
  }

  const sortedComplaints = useMemo(() => {
    return [...filteredComplaints].sort((a, b) => {
      const severityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const aOrder = severityOrder[a.severity] ?? 4;
      const bOrder = severityOrder[b.severity] ?? 4;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [filteredComplaints]);

  return (
    <div className="complaints-page">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="mb-1 fw-bold">Complaints Management</h2>
          <div className="text-muted">Track and resolve guest issues efficiently.</div>
        </div>
        <button className="modern-btn modern-btn-outline" onClick={() => loadComplaints()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Board"}
        </button>
      </div>

      {error && <div className="alert alert-danger rounded-3">{error}</div>}

      <div className="row g-4">
        <div className="col-12 col-xl-7">
          <div className="modern-card mb-4">
            <div className="modern-card-header d-flex justify-content-between align-items-center flex-wrap gap-3">
              <h5 className="mb-0">Active Complaints</h5>
              <div className="d-flex flex-wrap gap-3">
                <div className="form-check d-flex align-items-center gap-2">
                  <input className="form-check-input mt-0" type="radio" name="view" id="viewAll" value="all" checked={viewMode === "all"} onChange={(e) => { setViewMode(e.target.value); setFilterBookingId(""); }} />
                  <label className="form-check-label fw-medium text-dark" htmlFor="viewAll">All</label>
                </div>
                <div className="form-check d-flex align-items-center gap-2">
                  <input className="form-check-input mt-0" type="radio" name="view" id="viewBooking" value="booking" checked={viewMode === "booking"} onChange={(e) => setViewMode(e.target.value)} />
                  <label className="form-check-label fw-medium text-dark" htmlFor="viewBooking">By Booking</label>
                </div>
              </div>
            </div>

            <div className="modern-card-body pt-3 bg-light border-bottom">
               {viewMode === "booking" && (
                <div className="mb-3">
                  <input className="modern-input border-primary" placeholder="Enter Booking ID to filter..." value={filterBookingId} onChange={(e) => setFilterBookingId(e.target.value)} />
                </div>
              )}
              <div className="d-flex flex-wrap gap-2">
                <input className="modern-input flex-grow-1" style={{ minWidth: 200 }} placeholder="Search tickets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <select className="modern-input" style={{ width: 'auto' }} value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                  <option value="">Severities</option>
                  {severityOptions.map((sev) => <option key={sev} value={sev}>{sev}</option>)}
                </select>
                <select className="modern-input" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Statuses</option>
                  {statusOptions.map((stat) => <option key={stat} value={stat}>{stat}</option>)}
                </select>
                <select className="modern-input text-capitalize" style={{ width: 'auto' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="">Categories</option>
                  {categoryOptions.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            <div className="modern-card-body bg-light pt-2">
              <div className="complaint-list-wrapper">
                {sortedComplaints.map((complaint) => (
                  <ComplaintCard key={complaint.complaintId} complaint={complaint} selected={selectedComplaint?.complaintId === complaint.complaintId} onClick={() => setSelectedComplaint(complaint)} />
                ))}
                {!loading && sortedComplaints.length === 0 && (
                  <div className="text-muted py-5 text-center bg-white rounded-3 border">
                    <span className="fs-2 d-block mb-2">🎉</span>
                    No complaints match your filters.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modern-card">
            <div className="modern-card-header">
              <h5 className="mb-0">File New Complaint</h5>
            </div>
            <div className="modern-card-body">
              <form onSubmit={handleCreateComplaint}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="modern-label">Booking ID</label>
                    <input className="modern-input" value={createForm.bookingId} onChange={(e) => setCreateForm(p => ({ ...p, bookingId: e.target.value }))} required />
                  </div>
                  <div className="col-md-6">
                    <label className="modern-label">Room Number</label>
                    <input className="modern-input" value={createForm.roomNumber} onChange={(e) => setCreateForm(p => ({ ...p, roomNumber: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="modern-label">Category</label>
                    <select className="modern-input text-capitalize" value={createForm.category} onChange={(e) => setCreateForm(p => ({ ...p, category: e.target.value }))}>
                      {categoryOptions.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="modern-label">Severity</label>
                    <select className="modern-input text-capitalize" value={createForm.severity} onChange={(e) => setCreateForm(p => ({ ...p, severity: e.target.value }))}>
                      {severityOptions.map((sev) => <option key={sev} value={sev}>{sev}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="modern-label">Title</label>
                    <input className="modern-input" value={createForm.title} onChange={(e) => setCreateForm(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="col-12">
                    <label className="modern-label">Description</label>
                    <textarea className="modern-input" rows="3" value={createForm.description} onChange={(e) => setCreateForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="modern-label">Report Source</label>
                    <select className="modern-input text-capitalize" value={createForm.source} onChange={(e) => setCreateForm(p => ({ ...p, source: e.target.value }))}>
                      <option value="http">Online Portal</option>
                      <option value="telegram">Telegram</option>
                      <option value="phone">Phone</option>
                      <option value="in_person">In Person</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="modern-label">Internal Notes</label>
                    <input className="modern-input" value={createForm.notes} onChange={(e) => setCreateForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                </div>
                <div className="mt-4 pt-2 border-top">
                  <button className="modern-btn modern-btn-primary" type="submit" disabled={createLoading}>
                    {createLoading ? "Filing..." : "Submit Complaint Ticket"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="modern-card sticky-top" style={{ top: '24px', zIndex: 1 }}>
            <div className="modern-card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Ticket Details</h5>
              {selectedComplaint && <span className="modern-badge badge-dark font-monospace">{selectedComplaint.complaintId.slice(-8)}</span>}
            </div>
            <div className="modern-card-body">
              {!selectedComplaint ? (
                <div className="text-center py-5 text-muted">
                  <span className="fs-1 d-block mb-3">🎫</span>
                  Select a ticket from the board to view history and resolve.
                </div>
              ) : detailError ? (
                <div className="alert alert-danger rounded-3">{detailError}</div>
              ) : (
                <div className="fade-in">
                  <div className="d-flex justify-content-between align-items-start mb-4">
                    <div>
                      <h3 className="mb-1 fw-bold text-dark">{selectedComplaint.title}</h3>
                      <div className="text-muted text-capitalize">{selectedComplaint.category}</div>
                    </div>
                    <div className="d-flex flex-column gap-2 align-items-end">
                      <span className={`modern-badge ${badgeColorMap[selectedComplaint.status]}`}>{selectedComplaint.status}</span>
                      <span className={`modern-badge ${badgeColorMap[selectedComplaint.severity]}`}>{selectedComplaint.severity}</span>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-6"><DetailLine label="Guest Name" value={selectedComplaint.guestName} /></div>
                    <div className="col-6"><DetailLine label="Room" value={selectedComplaint.roomNumber} /></div>
                    <div className="col-6"><DetailLine label="Assigned To" value={selectedComplaint.assignedToName} /></div>
                    <div className="col-6"><DetailLine label="Created On" value={new Date(selectedComplaint.createdAt).toLocaleDateString()} /></div>
                  </div>
                  
                  <div className="p-3 bg-light rounded-3 border mt-2 mb-4">
                    <div className="modern-label text-muted">Description</div>
                    <p className="mb-0 text-dark fw-medium">{selectedComplaint.description || "No description provided."}</p>
                  </div>

                  {selectedComplaint.relatedTaskId && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-3" style={{backgroundColor: '#eff6ff', borderColor: '#bfdbfe'}}>
                      <div className="modern-label text-blue-700" style={{color: '#1d4ed8'}}>Linked Auto-Task</div>
                      <div className="fw-semibold text-dark">Task created automatically</div>
                      <div className="text-muted small">Check the Tasks module for assignment status.</div>
                    </div>
                  )}

                  {selectedComplaint.activityLogs && selectedComplaint.activityLogs.length > 0 && (
                    <div className="mb-4">
                      <div className="modern-label border-bottom pb-2">Resolution Timeline</div>
                      <div className="history-timeline">
                        {selectedComplaint.activityLogs.map((log, idx) => (
                          <div key={idx} className="history-item">
                            <div className="history-dot"></div>
                            <div className="history-content">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <strong className="text-capitalize text-dark">{log.action}</strong>
                                <span className="small text-muted">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ""}</span>
                              </div>
                              <div className="small text-muted">{log.message || "System update"}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedComplaint.status !== "resolved" && selectedComplaint.status !== "closed" && (
                    <div className="mt-4 pt-4 border-top">
                      <form onSubmit={handleResolveComplaint}>
                        <label className="modern-label">Resolve Ticket</label>
                        <textarea
                          className="modern-input mb-3"
                          rows="3"
                          placeholder="Detail the actions taken to resolve this issue..."
                          value={resolveForm.resolutionNotes}
                          onChange={(e) => setResolveForm({ resolutionNotes: e.target.value })}
                          required
                        />
                        <button className="modern-btn modern-btn-success w-100" type="submit" disabled={resolveLoading}>
                          {resolveLoading ? "Processing..." : "Mark as Resolved"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}