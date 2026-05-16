import { useEffect, useMemo, useState } from "react";
import {
  assignTask, completeTask, createTask, getTaskByTaskId, getTaskMetrics, getTasks, updateTaskStatus,
} from "../api";
import "../styles/Tasks.css"; // Ensure you link the new CSS file

const statusOptions = ["pending", "assigned", "accepted", "in_progress", "completed", "cancelled", "delayed", "escalated"];
const priorityOptions = ["low", "medium", "high", "urgent", "vip"];
const departmentOptions = ["reception", "parking", "housekeeping", "maintenance", "food_service", "security"];

function MetricCard({ label, value, tone = "primary" }) {
  return (
    <div className="col-6 col-lg-3 mb-3">
      <div className={`metric-card metric-card-${tone}`}>
        <p className="metric-label">{label}</p>
        <h4 className="metric-value">{value}</h4>
      </div>
    </div>
  );
}

function StatPill({ label, count }) {
  return (
    <div className="modern-stat-pill">
      <span className="stat-label">{label}</span>
      <span className="stat-count">{count}</span>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-group">
      <label>{label}</label>
      <p>{value || "N/A"}</p>
    </div>
  );
}

function normalizeTask(task) {
  return {
    ...task,
    taskId: task.taskId || task._id,
    guestName: task.guestId?.fullName || task.guestName || "N/A",
    guestPhone: task.guestId?.phone || task.guestPhone || "N/A",
    assignedToName: task.assignedTo?.fullName || task.assignedToName || "Unassigned",
  };
}

// Helper to map status/priority to custom CSS badge classes
function getBadgeClass(type, value) {
  if (!value) return "badge-default";
  const normalized = value.toLowerCase();
  if (type === "status") {
    const map = { pending: "badge-warning", assigned: "badge-info", accepted: "badge-primary", in_progress: "badge-success", completed: "badge-secondary", cancelled: "badge-danger", delayed: "badge-dark", escalated: "badge-danger" };
    return map[normalized] || "badge-default";
  }
  if (type === "priority") {
    const map = { low: "badge-secondary", medium: "badge-info", high: "badge-warning", urgent: "badge-danger", vip: "badge-vip" };
    return map[normalized] || "badge-default";
  }
  return "badge-default";
}

export default function Tasks() {
  // State initialization remains exactly the same
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [listOnlyOpen, setListOnlyOpen] = useState(false);
  const [statusAction, setStatusAction] = useState("in_progress");
  const [assignForm, setAssignForm] = useState({ taskId: "", staffId: "" });
  const [createForm, setCreateForm] = useState({
    bookingId: "", guestId: "", department: "housekeeping", title: "", description: "", priority: "medium", taskType: "housekeeping", roomNumber: "", notes: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // API calls remain the same
  async function loadTasks() {
    setLoading(true); setError("");
    try {
      const [metricsRes, tasksRes] = await Promise.all([
        getTaskMetrics(),
        getTasks({
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(departmentFilter ? { department: departmentFilter } : {}),
          ...(priorityFilter ? { priority: priorityFilter } : {}),
        }),
      ]);
      setMetrics(metricsRes.data?.data?.tasks || metricsRes.data?.tasks || {});
      setTasks((tasksRes.data?.tasks || tasksRes.data?.data?.tasks || []).map(normalizeTask));
    } catch (err) { setError(err.response?.data?.message || err.message || "Failed to load tasks"); } finally { setLoading(false); }
  }

  useEffect(() => { loadTasks(); }, [statusFilter, departmentFilter, priorityFilter]);

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    const next = tasks.filter((task) => {
      const isOpen = ["pending", "assigned", "accepted", "in_progress", "delayed", "escalated"].includes(task.status);
      const matchesSearch = !term || [task.taskId, task.title, task.description, task.guestName, task.roomNumber, task.department]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
      return matchesSearch && (!listOnlyOpen || isOpen);
    });
    setFilteredTasks(next);
  }, [tasks, searchTerm, listOnlyOpen]);

  async function openTask(task) {
    setSelectedTask(task); setTaskDetails(null); setDetailError(""); setDetailLoading(true);
    try {
      const res = await getTaskByTaskId(task.taskId);
      const fullTask = normalizeTask(res.data?.task || res.data?.data?.task || res.data);
      setTaskDetails(fullTask);
      setAssignForm({ taskId: fullTask.taskId, staffId: fullTask.assignedTo?.id || "" });
      setStatusAction(fullTask.status === "completed" ? "completed" : fullTask.status === "cancelled" ? "cancelled" : "in_progress");
    } catch (err) { setDetailError(err.response?.data?.message || err.message || "Failed to load task details"); } finally { setDetailLoading(false); }
  }

  async function refreshAfterAction() {
    await loadTasks();
    if (selectedTask?.taskId) {
      const res = await getTaskByTaskId(selectedTask.taskId);
      setTaskDetails(normalizeTask(res.data?.task || res.data?.data?.task || res.data));
    }
  }

  async function handleStatusUpdate(e) {
    e.preventDefault(); if (!selectedTask) return;
    setActionLoading(true); setDetailError("");
    try { await updateTaskStatus({ taskId: selectedTask.taskId, status: statusAction }); await refreshAfterAction(); } catch (err) { setDetailError(err.response?.data?.message || err.message || "Failed to update task status"); } finally { setActionLoading(false); }
  }

  async function handleAssignTask(e) {
    e.preventDefault(); setActionLoading(true); setDetailError("");
    try { await assignTask(assignForm); await refreshAfterAction(); } catch (err) { setDetailError(err.response?.data?.message || err.message || "Failed to assign task"); } finally { setActionLoading(false); }
  }

  async function handleCompleteTask() {
    if (!selectedTask) return; setActionLoading(true); setDetailError("");
    try { await completeTask({ taskId: selectedTask.taskId }); await refreshAfterAction(); } catch (err) { setDetailError(err.response?.data?.message || err.message || "Failed to complete task"); } finally { setActionLoading(false); }
  }

  async function handleCreateTask(e) {
    e.preventDefault(); setCreateLoading(true); setError("");
    try {
      await createTask(createForm);
      setCreateForm({ bookingId: "", guestId: "", department: "housekeeping", title: "", description: "", priority: "medium", taskType: "housekeeping", roomNumber: "", notes: "" });
      await loadTasks();
    } catch (err) { setError(err.response?.data?.message || err.message || "Failed to create task"); } finally { setCreateLoading(false); }
  }

  const topStatusMetrics = metrics?.byStatus || [];
  const topDepartmentMetrics = metrics?.byDepartment || [];
  const topPriorityMetrics = metrics?.byPriority || [];
  const filteredOpenCount = useMemo(() => filteredTasks.filter((task) => ["pending", "assigned", "accepted", "in_progress", "delayed", "escalated"].includes(task.status)).length, [filteredTasks]);

  return (
    <div className="tasks-page p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="mb-0 fw-bold">Tasks Dashboard</h2>
          <p className="text-muted mb-0">Track work queues, update progress, and create operational follow-ups.</p>
        </div>
        <button className="modern-btn modern-btn-outline" onClick={loadTasks} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Tasks"}
        </button>
      </div>

      {error && <div className="modern-alert modern-alert-danger">{error}</div>}

      <div className="row">
        <MetricCard label="Total Tasks" value={metrics?.totalTasks ?? tasks.length} tone="primary" />
        <MetricCard label="Open Tasks" value={metrics?.totalTasks ? metrics.totalTasks - (metrics.completedTasks || 0) : filteredOpenCount} tone="warning" />
        <MetricCard label="Overdue" value={metrics?.overdueTasks ?? 0} tone="danger" />
        <MetricCard label="Completed Today" value={metrics?.completedToday ?? 0} tone="success" />
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-4">
          <div className="modern-card h-100">
            <div className="modern-card-header"><h5>Status Breakdown</h5></div>
            <div className="modern-card-body p-3">
              {topStatusMetrics.length > 0 ? topStatusMetrics.map((item) => <StatPill key={item.value || item.label} label={item.label} count={item.count} />) : <div className="text-muted">No data.</div>}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="modern-card h-100">
            <div className="modern-card-header"><h5>Department Breakdown</h5></div>
            <div className="modern-card-body p-3">
              {topDepartmentMetrics.length > 0 ? topDepartmentMetrics.map((item) => <StatPill key={item.value || item.label} label={item.label} count={item.count} />) : <div className="text-muted">No data.</div>}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="modern-card h-100">
            <div className="modern-card-header"><h5>Priority Breakdown</h5></div>
            <div className="modern-card-body p-3">
              {topPriorityMetrics.length > 0 ? topPriorityMetrics.map((item) => <StatPill key={item.value || item.label} label={item.label} count={item.count} />) : <div className="text-muted">No data.</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-7">
          <div className="modern-card mb-4">
            <div className="modern-card-header d-flex flex-wrap justify-content-between align-items-center gap-3">
              <h5 className="mb-0">Task Queue</h5>
              <div className="d-flex flex-wrap gap-2">
                <input className="modern-input" style={{ minWidth: 200 }} placeholder="Search tasks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <select className="modern-input" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="modern-input" style={{ width: 'auto' }} value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                  <option value="">All Departments</option>
                  {departmentOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="modern-input" style={{ width: 'auto' }} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                  <option value="">All Priorities</option>
                  {priorityOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="modern-card-body pt-3">
              <div className="modern-checkbox-group mb-3">
                <input type="checkbox" id="openOnly" checked={listOnlyOpen} onChange={(e) => setListOnlyOpen(e.target.checked)} />
                <label htmlFor="openOnly">Show open tasks only</label>
              </div>

              <div className="table-responsive">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Task Info</th>
                      <th>Location/Guest</th>
                      <th>Department</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => (
                      <tr key={task.taskId} onClick={() => openTask(task)} className={selectedTask?.taskId === task.taskId ? "selected-row" : ""}>
                        <td>
                          <div className="fw-bold text-dark">{task.title}</div>
                          <div className="text-muted small">{task.taskId.slice(-8)}</div>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{task.roomNumber || "N/A"}</div>
                          <div className="text-muted small">{task.guestName}</div>
                        </td>
                        <td className="text-capitalize">{task.department}</td>
                        <td><span className={`modern-badge ${getBadgeClass("priority", task.priority)}`}>{task.priority}</span></td>
                        <td><span className={`modern-badge ${getBadgeClass("status", task.status)}`}>{task.status}</span></td>
                      </tr>
                    ))}
                    {!loading && filteredTasks.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">No tasks found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="modern-card">
            <div className="modern-card-header"><h5>Create New Task</h5></div>
            <div className="modern-card-body">
              <form onSubmit={handleCreateTask}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Booking ID</label>
                    <input className="modern-input" value={createForm.bookingId} onChange={(e) => setCreateForm(p => ({ ...p, bookingId: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Guest ID</label>
                    <input className="modern-input" value={createForm.guestId} onChange={(e) => setCreateForm(p => ({ ...p, guestId: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Department</label>
                    <select className="modern-input text-capitalize" value={createForm.department} onChange={(e) => setCreateForm(p => ({ ...p, department: e.target.value, taskType: e.target.value }))}>
                      {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Priority</label>
                    <select className="modern-input text-capitalize" value={createForm.priority} onChange={(e) => setCreateForm(p => ({ ...p, priority: e.target.value }))}>
                      {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Title</label>
                    <input className="modern-input" value={createForm.title} onChange={(e) => setCreateForm(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <textarea className="modern-input" rows="2" value={createForm.description} onChange={(e) => setCreateForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Room Number</label>
                    <input className="modern-input" value={createForm.roomNumber} onChange={(e) => setCreateForm(p => ({ ...p, roomNumber: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Notes</label>
                    <input className="modern-input" value={createForm.notes} onChange={(e) => setCreateForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                </div>
                <div className="mt-4">
                  <button className="modern-btn modern-btn-primary w-100" type="submit" disabled={createLoading}>
                    {createLoading ? "Creating..." : "Create Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="modern-card sticky-top" style={{ top: '20px', zIndex: 1 }}>
            <div className="modern-card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Task Detail Panel</h5>
              {selectedTask && <span className="modern-badge badge-dark">{selectedTask.taskId.slice(-8)}</span>}
            </div>
            <div className="modern-card-body">
              {!selectedTask ? (
                <div className="text-center py-5 text-muted">
                  <span className="fs-1 d-block mb-2">📋</span>
                  Select a task from the queue to view details and actions.
                </div>
              ) : detailLoading ? (
                <div className="modern-alert modern-alert-info">Loading task details...</div>
              ) : detailError ? (
                <div className="modern-alert modern-alert-danger">{detailError}</div>
              ) : (
                <>
                  <div className="d-flex justify-content-between align-items-start mb-4">
                    <div>
                      <h4 className="mb-1 fw-bold text-dark">{taskDetails?.title || selectedTask.title}</h4>
                      <div className="text-muted text-capitalize">{taskDetails?.department || selectedTask.department} · {taskDetails?.priority || selectedTask.priority}</div>
                    </div>
                    <span className={`modern-badge ${getBadgeClass("status", taskDetails?.status || selectedTask.status)}`}>
                      {taskDetails?.status || selectedTask.status}
                    </span>
                  </div>

                  <DetailRow label="Guest" value={taskDetails?.guestName || selectedTask.guestName} />
                  <DetailRow label="Room" value={taskDetails?.roomNumber || selectedTask.roomNumber} />
                  <DetailRow label="Assigned To" value={taskDetails?.assignedToName || selectedTask.assignedToName} />
                  <DetailRow label="Description" value={taskDetails?.description || selectedTask.description} />
                  <DetailRow label="Notes" value={taskDetails?.notes || selectedTask.notes} />

                  <div className="mt-4 mb-4">
                    <label className="form-label d-block mb-3">Activity Log</label>
                    {(taskDetails?.activityLogs || selectedTask.activityLogs || []).length > 0 ? (
                      <div className="activity-timeline">
                        {(taskDetails?.activityLogs || selectedTask.activityLogs || []).map((item, index) => (
                          <div key={index} className="activity-item">
                            <div className="activity-dot"></div>
                            <div className="activity-content">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <strong className="text-dark">{item.action}</strong>
                                <span className="small text-muted">{item.timestamp ? new Date(item.timestamp).toLocaleString() : ""}</span>
                              </div>
                              <p className="small text-muted mb-0">{item.message || "Status updated"}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted small bg-light p-3 rounded">No activity logs recorded yet.</div>
                    )}
                  </div>

                  <hr className="my-4" />

                  <form onSubmit={handleStatusUpdate} className="mb-3">
                    <label className="form-label">Update Status</label>
                    <div className="d-flex gap-2">
                      <select className="modern-input" value={statusAction} onChange={(e) => setStatusAction(e.target.value)}>
                        {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                      <button className="modern-btn modern-btn-primary" type="submit" disabled={actionLoading}>Update</button>
                    </div>
                  </form>

                  <form onSubmit={handleAssignTask} className="mb-4">
                    <label className="form-label">Assign Task</label>
                    <div className="d-flex gap-2">
                      <input className="modern-input" placeholder="Enter Staff ID..." value={assignForm.staffId} onChange={(e) => setAssignForm((prev) => ({ ...prev, staffId: e.target.value }))} />
                      <button className="modern-btn modern-btn-outline" type="submit" disabled={actionLoading}>Assign</button>
                    </div>
                  </form>

                  <button className="modern-btn modern-btn-success w-100" onClick={handleCompleteTask} disabled={actionLoading || (taskDetails?.status === 'completed')}>
                    {taskDetails?.status === 'completed' ? "Already Completed" : "✔ Mark as Completed"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}