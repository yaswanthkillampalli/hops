import { useEffect, useMemo, useState } from "react";
import {
  getMyStaffProfile,
  getStaffAnalytics,
  registerStaffMember,
  sendTelegramMessage,
} from "../api";
import "../styles/Staff.css"; // Ensure this matches your CSS path

const departmentOptions = [
  "reception", "parking", "housekeeping", "maintenance", "food_service", "security", "management",
];

const roleOptions = ["staff", "supervisor", "manager", "admin"];
const shiftOptions = ["morning", "afternoon", "night", "rotational"];

const statusBadgeColor = {
  active: "badge-success",
  busy: "badge-warning",
  offline: "badge-secondary",
  on_leave: "badge-dark",
};

const roleBadgeColor = {
  staff: "badge-secondary",
  supervisor: "badge-info",
  manager: "badge-primary",
  admin: "badge-dark"
};

function MetricCard({ label, value, color = "primary" }) {
  return (
    <div className="col-md-3 col-sm-6">
      <div className={`metric-card metric-card-${color}`}>
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value ?? 0}</div>
      </div>
    </div>
  );
}

function normalizeShift(shift) {
  if (!shift) return "N/A";
  if (typeof shift === "string") return shift;
  const start = shift.start || "";
  const end = shift.end || "";
  return start || end ? `${start}${start && end ? " - " : ""}${end}` : "N/A";
}

function StaffRow({ staff }) {
  return (
    <tr>
      <td>
        <div className="fw-bold text-dark">{staff.fullName}</div>
        <div className="small text-muted">{staff.email || "N/A"}</div>
      </td>
      <td>
        <span className={`modern-badge ${roleBadgeColor[staff.role] || "badge-secondary"}`}>
          {staff.role || "N/A"}
        </span>
      </td>
      <td>
        <span className="modern-badge badge-info text-capitalize">
          {staff.department?.replace('_', ' ') || "N/A"}
        </span>
      </td>
      <td className="text-capitalize text-muted fw-medium">{normalizeShift(staff.shift)}</td>
      <td className="font-monospace text-muted">{staff.employeeId || "N/A"}</td>
      <td>
        <span className={`modern-badge ${statusBadgeColor[staff.currentStatus] || "badge-secondary"}`}>
          {staff.currentStatus?.replace('_', ' ') || "N/A"}
        </span>
      </td>
    </tr>
  );
}

function ProfileCard({ profile }) {
  return (
    <div className="modern-card mb-4 border-highlight-primary">
      <div className="modern-card-header">
        <h5 className="mb-0">My Profile</h5>
      </div>
      <div className="modern-card-body bg-light">
        {!profile ? (
          <div className="text-muted text-center py-3">Profile unavailable.</div>
        ) : (
          <div className="row g-3">
            <div className="col-md-6">
              <div className="detail-label">Name</div>
              <div className="detail-value">{profile.fullName || profile.name || "N/A"}</div>
            </div>
            <div className="col-md-6">
              <div className="detail-label">Role</div>
              <div className="detail-value text-capitalize">{profile.role || "N/A"}</div>
            </div>
            <div className="col-md-6">
              <div className="detail-label">Email</div>
              <div className="detail-value">{profile.email || "N/A"}</div>
            </div>
            <div className="col-md-6">
              <div className="detail-label">Phone</div>
              <div className="detail-value">{profile.phone || "N/A"}</div>
            </div>
            <div className="col-md-6">
              <div className="detail-label">Employee ID</div>
              <div className="detail-value font-monospace">{profile.employeeId || "N/A"}</div>
            </div>
            <div className="col-md-6">
              <div className="detail-label">Department</div>
              <div className="detail-value text-capitalize">{profile.department?.replace('_', ' ') || "N/A"}</div>
            </div>
            <div className="col-12 mt-3 pt-3 border-top">
              <div className="detail-label">Telegram Chat ID</div>
              <div className="detail-value font-monospace">{profile.telegramChatId || "Not linked"}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Staff() {
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  const [registerLoading, setRegisterLoading] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  
  const [registerForm, setRegisterForm] = useState({
    businessId: "", fullName: "", phone: "", email: "", password: "", employeeId: "", department: "reception", role: "staff", shift: "morning",
  });
  
  const [telegramForm, setTelegramForm] = useState({ chatId: "", message: "" });

  useEffect(() => {
    const storedBusiness = localStorage.getItem("so_business");
    if (storedBusiness) {
      try {
        const parsed = JSON.parse(storedBusiness);
        setRegisterForm((prev) => ({ ...prev, businessId: parsed._id || parsed.id || "" }));
      } catch { /* ignore parse failures */ }
    }
  }, []);

  async function loadStaff() {
    setLoading(true); setError("");
    try {
      const [analyticsRes, profileRes] = await Promise.allSettled([
        getStaffAnalytics(), getMyStaffProfile(),
      ]);

      if (analyticsRes.status === "fulfilled") {
        const staffData = analyticsRes.value.data?.data?.staff || analyticsRes.value.data?.staff || {};
        setMetrics(staffData);
        setStaffDirectory(staffData.staffDirectory || []);
      } else { throw analyticsRes.reason; }

      if (profileRes.status === "fulfilled") {
        setProfile(profileRes.value.data?.staff || profileRes.value.data?.data?.staff || null);
      } else {
        const storedBusiness = localStorage.getItem("so_business");
        if (storedBusiness) {
          try { setProfile(JSON.parse(storedBusiness)); } catch { setProfile(null); }
        }
      }
    } catch (err) { setError(err.response?.data?.message || err.message || "Failed to load staff data"); } finally { setLoading(false); }
  }

  useEffect(() => { loadStaff(); }, []);

  const filteredStaff = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return staffDirectory.filter((staff) => {
      const matchesSearch = !term || [staff.fullName, staff.employeeId, staff.email, staff.phone, staff.department, staff.role]
          .filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
      const matchesRole = !roleFilter || staff.role === roleFilter;
      const matchesDepartment = !departmentFilter || staff.department === departmentFilter;
      const matchesStatus = !statusFilter || staff.currentStatus === statusFilter;
      return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
    });
  }, [staffDirectory, searchTerm, roleFilter, departmentFilter, statusFilter]);

  async function handleRegister(e) {
    e.preventDefault(); setRegisterLoading(true); setError("");
    try {
      await registerStaffMember({ ...registerForm, businessId: registerForm.businessId || profile?.businessId || "" });
      await loadStaff();
      setRegisterForm((prev) => ({ ...prev, fullName: "", phone: "", email: "", password: "", employeeId: "" }));
    } catch (err) { setError(err.response?.data?.message || err.message || "Failed to register staff"); } finally { setRegisterLoading(false); }
  }

  async function handleSendTelegram(e) {
    e.preventDefault(); setTelegramLoading(true); setError("");
    try {
      await sendTelegramMessage({ chatId: telegramForm.chatId, text: telegramForm.message });
      setTelegramForm({ chatId: "", message: "" });
    } catch (err) { setError(err.response?.data?.message || err.message || "Failed to send Telegram message"); } finally { setTelegramLoading(false); }
  }

  const roleCounts = metrics.byRole || [];
  const departmentCounts = metrics.byDepartment || [];
  const statusCounts = metrics.byCurrentStatus || [];

  return (
    <div className="staff-page p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="mb-1 fw-bold">Team & Staff</h2>
          <div className="text-muted">Register staff, view team composition, and manage Telegram broadcasts.</div>
        </div>
        <button className="modern-btn modern-btn-outline" onClick={loadStaff} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Directory"}
        </button>
      </div>

      {error && <div className="modern-alert modern-alert-danger">{error}</div>}

      <div className="row g-4 mb-4">
        <MetricCard label="Total Staff" value={metrics.totalStaff} color="primary" />
        <MetricCard label="Active" value={metrics.activeStaff} color="success" />
        <MetricCard label="Busy" value={metrics.busyStaff} color="warning" />
        <MetricCard label="On Leave" value={metrics.onLeaveStaff} color="dark" />
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-8">
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h5 className="mb-0">Staff Directory</h5>
                <span className="modern-badge badge-secondary">{filteredStaff.length} / {staffDirectory.length} Members</span>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <input className="modern-input flex-grow-1" style={{ minWidth: '200px' }} placeholder="Search name, ID, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <select className="modern-input text-capitalize" style={{ width: 'auto' }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="">All Roles</option>
                  {roleOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select className="modern-input text-capitalize" style={{ width: 'auto' }} value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                  <option value="">All Departments</option>
                  {departmentOptions.map((option) => <option key={option} value={option}>{option.replace('_', ' ')}</option>)}
                </select>
                <select className="modern-input text-capitalize" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  {Object.keys(statusBadgeColor).map((option) => <option key={option} value={option}>{option.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="modern-card-body p-0">
              <div className="table-responsive">
                <table className="modern-table mb-0">
                  <thead>
                    <tr>
                      <th>Name & Email</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Shift</th>
                      <th>Employee ID</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((staff) => <StaffRow key={staff.id || staff._id || staff.employeeId} staff={staff} />)}
                    {!loading && filteredStaff.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center text-muted py-5">
                          <span className="fs-3 d-block mb-2">🧑‍💼</span>
                          No staff members match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="modern-card">
            <div className="modern-card-header">
              <h5 className="mb-0">Register New Staff</h5>
            </div>
            <div className="modern-card-body bg-light">
              <form onSubmit={handleRegister}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="modern-label">Business ID</label>
                    <input className="modern-input font-monospace" value={registerForm.businessId} onChange={(e) => setRegisterForm((prev) => ({ ...prev, businessId: e.target.value }))} required />
                  </div>
                  <div className="col-md-6">
                    <label className="modern-label">Full Name</label>
                    <input className="modern-input" value={registerForm.fullName} onChange={(e) => setRegisterForm((prev) => ({ ...prev, fullName: e.target.value }))} required />
                  </div>
                  <div className="col-md-6">
                    <label className="modern-label">Phone</label>
                    <input className="modern-input" value={registerForm.phone} onChange={(e) => setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))} required />
                  </div>
                  <div className="col-md-6">
                    <label className="modern-label">Email</label>
                    <input type="email" className="modern-input" value={registerForm.email} onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))} required />
                  </div>
                  <div className="col-md-6">
                    <label className="modern-label">Password</label>
                    <input type="password" className="modern-input" value={registerForm.password} onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))} required />
                  </div>
                  <div className="col-md-6">
                    <label className="modern-label">Employee ID</label>
                    <input className="modern-input font-monospace" value={registerForm.employeeId} onChange={(e) => setRegisterForm((prev) => ({ ...prev, employeeId: e.target.value }))} required />
                  </div>
                  <div className="col-md-4">
                    <label className="modern-label">Department</label>
                    <select className="modern-input text-capitalize" value={registerForm.department} onChange={(e) => setRegisterForm((prev) => ({ ...prev, department: e.target.value }))}>
                      {departmentOptions.map((option) => <option key={option} value={option}>{option.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="modern-label">Role</label>
                    <select className="modern-input text-capitalize" value={registerForm.role} onChange={(e) => setRegisterForm((prev) => ({ ...prev, role: e.target.value }))}>
                      {roleOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="modern-label">Shift</label>
                    <select className="modern-input text-capitalize" value={registerForm.shift} onChange={(e) => setRegisterForm((prev) => ({ ...prev, shift: e.target.value }))}>
                      {shiftOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-top">
                  <button className="modern-btn modern-btn-primary" type="submit" disabled={registerLoading}>
                    {registerLoading ? "Registering..." : "Register Staff Member"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <ProfileCard profile={profile} />

          <div className="modern-card mb-4 border-highlight-info">
            <div className="modern-card-header">
              <h5 className="mb-0">Telegram Broadcast</h5>
            </div>
            <div className="modern-card-body">
              <p className="small text-muted mb-3">Send instant alerts to staff members connected via Telegram.</p>
              <form onSubmit={handleSendTelegram}>
                <div className="mb-3">
                  <label className="modern-label">Chat ID</label>
                  <input className="modern-input font-monospace" placeholder="Enter Telegram Chat ID..." value={telegramForm.chatId} onChange={(e) => setTelegramForm((prev) => ({ ...prev, chatId: e.target.value }))} required />
                </div>
                <div className="mb-3">
                  <label className="modern-label">Message</label>
                  <textarea className="modern-input" rows="4" placeholder="Type your broadcast message here..." value={telegramForm.message} onChange={(e) => setTelegramForm((prev) => ({ ...prev, message: e.target.value }))} required />
                </div>
                <button className="modern-btn modern-btn-success w-100" type="submit" disabled={telegramLoading}>
                  {telegramLoading ? "Sending..." : "Send via Telegram"}
                </button>
              </form>
            </div>
          </div>

          <div className="modern-card">
            <div className="modern-card-header">
              <h5 className="mb-0">Team Composition</h5>
            </div>
            <div className="modern-card-body bg-light">
              
              <div className="mb-4">
                <div className="modern-label border-bottom pb-2 mb-2">By Role</div>
                {roleCounts.map((item) => (
                  <div key={item._id} className="stat-row">
                    <span className="text-capitalize">{item._id || "unassigned"}</span>
                    <strong className="text-dark">{item.count}</strong>
                  </div>
                ))}
              </div>
              
              <div className="mb-4">
                <div className="modern-label border-bottom pb-2 mb-2">By Department</div>
                {departmentCounts.map((item) => (
                  <div key={item._id} className="stat-row">
                    <span className="text-capitalize">{item._id?.replace('_', ' ') || "unassigned"}</span>
                    <strong className="text-dark">{item.count}</strong>
                  </div>
                ))}
              </div>
              
              <div>
                <div className="modern-label border-bottom pb-2 mb-2">By Status</div>
                {statusCounts.map((item) => (
                  <div key={item._id} className="stat-row">
                    <span className="text-capitalize">{item._id?.replace('_', ' ') || "unassigned"}</span>
                    <strong className="text-dark">{item.count}</strong>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}