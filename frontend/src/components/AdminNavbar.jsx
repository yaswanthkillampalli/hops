import { Link, NavLink, useNavigate } from "react-router-dom";
import { removeToken } from "../utils/auth";
import '../styles/AdminNavbar.css'; 

const items = [
  ["Dashboard", "/admin/dashboard"],
  ["Bookings", "/admin/bookings"],
  ["Rooms", "/admin/rooms"],
  ["Tasks", "/admin/tasks"],
  ["Complaints", "/admin/complaints"],
  ["Maint.", "/admin/maintenance"],
  ["Parking", "/admin/parking"],
  ["Staff", "/admin/staff"],
  ["Analytics", "/admin/analytics"],
  ["Profile", "/admin/profile"],
];

export default function AdminNavbar() {
  const navigate = useNavigate();
  
  function logout() {
    removeToken();
    localStorage.removeItem("so_business");
    navigate("/admin/login");
  }

  return (
    <nav className="navbar navbar-expand-lg custom-admin-navbar sticky-top">
      <div className="container-fluid px-4">
        <Link className="navbar-brand brand-logo" to="/admin/dashboard">
          <span className="brand-icon">🏨</span> HospOps
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="nav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 nav-link-list">
            {items.map(([label, to]) => (
              <li key={to} className="nav-item">
                <NavLink 
                  className={({ isActive }) => isActive ? "custom-nav-link active" : "custom-nav-link"} 
                  to={to}
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </div>
    </nav>
  );
}