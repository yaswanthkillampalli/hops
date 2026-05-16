import { useEffect, useMemo, useState } from "react";
import {
  createMaintenance,
  getMaintenanceByBooking,
  getMaintenanceList,
  resolveMaintenance,
} from "../api";
import "../styles/Maintenance.css"; // Link the new custom CSS

const issueTypeOptions = ["general", "plumbing", "electrical", "hvac", "furniture", "damage", "cleaning", "other"];
const severityOptions = ["low", "medium", "high", "urgent"];
const statusOptions = ["open", "assigned", "in_progress", "resolved", "closed", "cancelled"];
const roomStatusOptions = ["operational", "maintenance_required", "under_maintenance", "out_of_service"];

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

function MaintenanceCard({ request, selected, onClick }) {
  const sevClass = severityClassMap[request.severity] || severityClassMap.medium;
  const selClass = selected ? "maintenance-card--selected" : "";

  return (
    <div className={`maintenance-card ${sevClass} ${selClass}`} onClick={onClick}>
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h6 className="mb-1 fw-bold text-dark" style={{ fontSize: '1rem' }}>{request.title}</h6>
          <div className="small text-muted font-monospace">{request.maintenanceRequestId.slice(-8)}</div>
        </div>
        <div className="d-flex gap-2 flex-wrap justify-content-end">
          <span className={`modern-badge ${badgeColorMap[request.status]}`}>{request.status}</span>
          <span className={`modern-badge ${badgeColorMap[request.severity]}`}>{request.severity}</span>
        </div>
      </div>
      <div className="d-flex justify-content-between align-items-end mt-3">
        <div className="small fw-medium text-dark">
          {request.guestName || "N/A"} <span className="text-muted mx-1">•</span> Room {request.roomNumber || "N/A"}
        </div>
        <div className="small text-muted text-capitalize">
          {request.issueType}
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

function normalizeRequest(request) {
  return {
    ...request,
    maintenanceRequestId: request.maintenanceRequestId || request._id,
    guestName: request.guestId?.fullName || request.guestName || "N/A",
    guestPhone: request.guestId?.phone || request.guestPhone || "N/A",
    assignedToName: request.assignedTo?.fullName || request.assignedToName || "Unassigned",
  };
}

export default function Maintenance() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBookingId, setFilterBookingId] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [issueTypeFilter, setIssueTypeFilter] = useState("");
  const [viewMode, setViewMode] = useState("all");
  
  const [createForm, setCreateForm] = useState({
    bookingId: "", roomNumber: "", issueType: "general", severity: "medium", title: "", description: "", roomStatus: "maintenance_required", source: "http", notes: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [resolveForm, setResolveForm] = useState({ resolutionNotes: "" });
  const [resolveLoading, setResolveLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  async function loadRequests(useBookingId = "") {
    setLoading(true); setError(""); setDetailError("");
    try {
      let data = [];
      if (useBookingId || filterBookingId) {
        const res = await getMaintenanceByBooking(useBookingId || filterBookingId);
        data = res.data?.maintenanceRequests || [];
      } else {
        const res = await getMaintenanceList();
        data = res.data?.maintenanceRequests || [];
      }
      setRequests(data.map(normalizeRequest));
    } catch (err) { setError(err.response?.data?.message || err.message || "Failed to load maintenance requests"); } finally { setLoading(false); }
  }

  useEffect(() => { loadRequests(); }, [viewMode, filterBookingId]);

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    const next = requests.filter((request) => {
      const matchesSearch = !term || [request.maintenanceRequestId, request.title, request.description, request.guestName, request.issueType, request.roomNumber]
          .filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
      const matchesSeverity = !severityFilter || request.severity === severityFilter;
      const matchesStatus = !statusFilter || request.status === statusFilter;
      const matchesIssueType = !issueTypeFilter || request.issueType === issueTypeFilter;
      return matchesSearch && matchesSeverity && matchesStatus && matchesIssueType;
    });
    setFilteredRequests(next);
  }, [requests, searchTerm, severityFilter, statusFilter, issueTypeFilter]);

  async function handleCreateRequest(e) {
    e.preventDefault(); setCreateLoading(true); setError("");
    try {
      await createMaintenance(createForm);
      setCreateForm({ bookingId: "", roomNumber: "", issueType: "general", severity: "medium", title: "", description: "", roomStatus: "maintenance_required", source: "http", notes: "" });
      await loadRequests();
    } catch (err) { setError(err.response?.data?.message || err.message || "Failed to create maintenance request"); } finally { setCreateLoading(false); }
  }

  async function handleResolveRequest(e) {
    e.preventDefault(); if (!selectedRequest) return;
    setResolveLoading(true); setDetailError("");
    try {
      await resolveMaintenance(selectedRequest.maintenanceRequestId, resolveForm.resolutionNotes);
      setResolveForm({ resolutionNotes: "" });
      await loadRequests();
      setSelectedRequest(null);
    } catch (err) { setDetailError(err.response?.data?.message || err.message || "Failed to resolve request"); } finally { setResolveLoading(false); }
  }

  const sortedRequests = useMemo(() => {
    return [...filteredRequests].sort((a, b) => {
      const severityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const aOrder = severityOrder[a.severity] ?? 4;
      const bOrder = severityOrder[b.severity] ?? 4;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [filteredRequests]);

  const groupedByRoom = useMemo(() => {
    const groups = {};
    sortedRequests.forEach((request) => {
      const room = request.roomNumber || "Unassigned";
      if (!groups[room]) groups[room] = [];
      groups[room].push(request);
    });
    return groups;
  }, [sortedRequests]);

  return (
    <div className="maintenance-page p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="mb-1 fw-bold">Maintenance Console</h2>
          <div className="text-muted">Log requests, track engineering tasks, and update room statuses.</div>
        </div>
        <button className="modern-btn modern-btn-outline" onClick={() => loadRequests()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Console"}
        </button>
      </div>

      {error && <div className="modern-alert modern-alert-danger">{error}</div>}

      <div className="row g-4">
        <div className="col-12 col-xl-7">
          <div className="modern-card mb-4">
            <div className="modern-card-header d-flex justify-content-between align-items-center flex-wrap gap-3">
              <h5 className="mb-0">Active Maintenance Jobs</h5>
              <div className="d-flex flex-wrap gap-3">
                <div className="modern-checkbox-group">
                  <input type="radio" name="view" id="viewAll" value="all" checked={viewMode === "all"} onChange={(e) => { setViewMode(e.target.value); setFilterBookingId(""); }} />
                  <label htmlFor="viewAll">All Jobs</label>
                </div>
                <div className="modern-checkbox-group">
                  <input type="radio" name="view" id="viewBooking" value="booking" checked={viewMode === "booking"} onChange={(e) => setViewMode(e.target.value)} />
                  <label htmlFor="viewBooking">By Booking</label>
                </div>
              </div>
            </div>
            
            <div className="modern-card-body pt-3 bg-light border-bottom">
              {viewMode === "booking" && (
                <div className="mb-3">
                  <input className="modern-input border-primary" placeholder="Enter Booking ID..." value={filterBookingId} onChange={(e) => setFilterBookingId(e.target.value)} />
                </div>
              )}
              <div className="d-flex flex-wrap gap-2">
                <input className="modern-input flex-grow-1" style={{ minWidth: 200 }} placeholder="Search jobs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <select className="modern-input" style={{ width: 'auto' }} value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                  <option value="">Severities</option>
                  {severityOptions.map((sev) => <option key={sev} value={sev}>{sev}</option>)}
                </select>
                <select className="modern-input" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Statuses</option>
                  {statusOptions.map((stat) => <option key={stat} value={stat}>{stat}</option>)}
                </select>
                <select className="modern-input text-capitalize" style={{ width: 'auto' }} value={issueTypeFilter} onChange={(e) => setIssueTypeFilter(e.target.value)}>
                  <option value="">Issue Types</option>
                  {issueTypeOptions.map((issue) => <option key={issue} value={issue}>{issue}</option>)}
                </select>
              </div>
            </div>

            <div className="modern-card-body bg-light pt-2">
              <div className="maintenance-list-wrapper">
                {Object.entries(groupedByRoom).map(([room, roomRequests]) => (
                  <div key={room} className="mb-4">
                    <div className="room-group-header">Room {room}</div>
                    {roomRequests.map((request) => (
                      <MaintenanceCard key={request.maintenanceRequestId} request={request} selected={selectedRequest?.maintenanceRequestId === request.maintenanceRequestId} onClick={() => setSelectedRequest(request)} />
                    ))}
                  </div>
                ))}
                {!loading && sortedRequests.length === 0 && (
                  <div className="text-muted py-5 text-center bg-white rounded-3 border">
                    <span className="fs-2 d-block mb-2">🛠️</span>
                    No maintenance jobs match your filters.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modern-card">
            <div className="modern-card-header">
              <h5 className="mb-0">Log New Maintenance Job</h5>
            </div>
            <div className="modern-card-body">
              <form onSubmit={handleCreateRequest}>
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
                    <label className="modern-label">Issue Type</label>
                    <select className="modern-input text-capitalize" value={createForm.issueType} onChange={(e) => setCreateForm(p => ({ ...p, issueType: e.target.value }))}>
                      {issueTypeOptions.map((issue) => <option key={issue} value={issue}>{issue}</option>)}
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
                    <textarea className="modern-input" rows="2" value={createForm.description} onChange={(e) => setCreateForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="modern-label">Room Status Impact</label>
                    <select className="modern-input text-capitalize" value={createForm.roomStatus} onChange={(e) => setCreateForm(p => ({ ...p, roomStatus: e.target.value }))}>
                      {roomStatusOptions.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                    </select>
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
                  <div className="col-12">
                    <label className="modern-label">Internal Notes</label>
                    <textarea className="modern-input" rows="2" value={createForm.notes} onChange={(e) => setCreateForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                </div>
                <div className="mt-4 pt-2 border-top">
                  <button className="modern-btn modern-btn-primary" type="submit" disabled={createLoading}>
                    {createLoading ? "Submitting..." : "Submit Maintenance Job"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="modern-card sticky-top" style={{ top: '24px', zIndex: 1 }}>
            <div className="modern-card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Job Detail Panel</h5>
              {selectedRequest && <span className="modern-badge badge-dark font-monospace">{selectedRequest.maintenanceRequestId.slice(-8)}</span>}
            </div>
            <div className="modern-card-body">
              {!selectedRequest ? (
                <div className="text-center py-5 text-muted">
                  <span className="fs-1 d-block mb-3">📋</span>
                  Select a maintenance job to view engineering details.
                </div>
              ) : detailError ? (
                <div className="modern-alert modern-alert-danger">{detailError}</div>
              ) : (
                <div className="fade-in">
                  <div className="d-flex justify-content-between align-items-start mb-4">
                    <div>
                      <h3 className="mb-1 fw-bold text-dark">{selectedRequest.title}</h3>
                      <div className="text-muted text-capitalize">{selectedRequest.issueType}</div>
                    </div>
                    <div className="d-flex flex-column gap-2 align-items-end">
                      <span className={`modern-badge ${badgeColorMap[selectedRequest.status]}`}>{selectedRequest.status}</span>
                      <span className={`modern-badge ${badgeColorMap[selectedRequest.severity]}`}>{selectedRequest.severity}</span>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-6"><DetailLine label="Guest Name" value={selectedRequest.guestName} /></div>
                    <div className="col-6"><DetailLine label="Room" value={selectedRequest.roomNumber} /></div>
                    <div className="col-6"><DetailLine label="Assigned To" value={selectedRequest.assignedToName} /></div>
                    <div className="col-6"><DetailLine label="Room Impact" value={selectedRequest.roomStatusImpact?.replace('_', ' ')} /></div>
                  </div>
                  
                  <div className="p-3 bg-light rounded-3 border mt-2 mb-4">
                    <div className="modern-label text-muted">Description</div>
                    <p className="mb-0 text-dark fw-medium">{selectedRequest.description || "No description provided."}</p>
                  </div>

                  {selectedRequest.relatedTaskId && (
                    <div className="mb-4 p-3 border rounded-3" style={{backgroundColor: '#fef2f2', borderColor: '#fecaca'}}>
                      <div className="modern-label" style={{color: '#b91c1c'}}>Linked Engineering Task</div>
                      <div className="fw-semibold text-dark">Engineering task auto-generated</div>
                      <div className="text-muted small">Check the Tasks module for assignment updates.</div>
                    </div>
                  )}

                  {selectedRequest.activityLogs && selectedRequest.activityLogs.length > 0 && (
                    <div className="mb-4">
                      <div className="modern-label border-bottom pb-2">Resolution Timeline</div>
                      <div className="history-timeline">
                        {selectedRequest.activityLogs.map((log, idx) => (
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

                  {selectedRequest.status !== "resolved" && selectedRequest.status !== "closed" && (
                    <div className="mt-4 pt-4 border-top">
                      <form onSubmit={handleResolveRequest}>
                        <label className="modern-label">Resolve Job</label>
                        <textarea
                          className="modern-input mb-3"
                          rows="3"
                          placeholder="Detail the engineering actions taken..."
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