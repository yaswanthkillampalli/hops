import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Bookings from "./pages/Bookings";
import Rooms from "./pages/Rooms";
import Tasks from "./pages/Tasks";
import Complaints from "./pages/Complaints";
import Maintenance from "./pages/Maintenance";
import Parking from "./pages/Parking";
import Staff from "./pages/Staff";
import Analytics from "./pages/Analytics";
import AdminNavbar from "./components/AdminNavbar";
import { getToken } from "./utils/auth";

function AdminLayout({ children }) {
  return (
    <>
      <AdminNavbar />
      <div>{children}</div>
    </>
  );
}

function RequireAuth({ children }) {
  const token = getToken();
  return token ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin">
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <RequireAuth>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="bookings"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Bookings />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="rooms"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Rooms />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="tasks"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Tasks />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="complaints"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Complaints />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="maintenance"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Maintenance />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="parking"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Parking />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="staff"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Staff />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="analytics"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Analytics />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

