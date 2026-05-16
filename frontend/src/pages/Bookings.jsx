import { useState, useEffect } from "react";
import {
  createBooking,
  scanBooking,
  completeCheckIn,
  getRoomSnapshot,
  checkoutBooking,
  getBookings,
  getBookingsList,
} from "../api";
import "../styles/Bookings.css"; // Link to custom CSS

function NewBookingForm({ onBookingCreated }) {
  const [formData, setFormData] = useState({
    guestName: "", guestPhone: "", guestEmail: "", roomType: "",
    checkInDate: "", checkOutDate: "", totalGuests: 1, specialRequests: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await createBooking(formData);
      if (res.data?.success) {
        setSuccess("Booking created successfully!");
        setFormData({
          guestName: "", guestPhone: "", guestEmail: "", roomType: "",
          checkInDate: "", checkOutDate: "", totalGuests: 1, specialRequests: "",
        });
        onBookingCreated?.();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modern-card mb-4">
      <div className="modern-card-header">
        <h5>New Booking</h5>
      </div>
      <div className="modern-card-body">
        {error && <div className="modern-alert modern-alert-danger">{error}</div>}
        {success && <div className="modern-alert modern-alert-success">{success}</div>}
        <form onSubmit={handleSubmit} className="modern-form">
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Guest Name</label>
              <input type="text" className="modern-input" value={formData.guestName} onChange={(e) => setFormData({ ...formData, guestName: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Phone</label>
              <input type="tel" className="modern-input" value={formData.guestPhone} onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })} required />
            </div>
          </div>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input type="email" className="modern-input" value={formData.guestEmail} onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Room Type</label>
              <input type="text" className="modern-input" value={formData.roomType} onChange={(e) => setFormData({ ...formData, roomType: e.target.value })} required />
            </div>
          </div>
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label className="form-label">Check-in</label>
              <input type="date" className="modern-input" value={formData.checkInDate} onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })} required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Check-out</label>
              <input type="date" className="modern-input" value={formData.checkOutDate} onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })} required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Total Guests</label>
              <input type="number" className="modern-input" min="1" value={formData.totalGuests} onChange={(e) => setFormData({ ...formData, totalGuests: parseInt(e.target.value) })} required />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Special Requests</label>
            <textarea className="modern-input" rows="2" value={formData.specialRequests} onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })} />
          </div>
          <button type="submit" className="modern-btn modern-btn-primary" disabled={loading}>
            {loading ? "Creating..." : "Create Booking"}
          </button>
        </form>
      </div>
    </div>
  );
}

function BookingTable({ bookings, onRowClick }) {
  const getStatusClass = (status) => {
    const map = { reserved: "badge-reserved", checked_in: "badge-checked-in", checked_out: "badge-checked-out", cancelled: "badge-cancelled" };
    return map[status] || "badge-default";
  };

  return (
    <div className="modern-card">
      <div className="modern-card-header">
        <h5>Booking Records</h5>
      </div>
      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Guest Name</th>
              <th>Room</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr><td colSpan="6" className="text-center text-muted py-4">No bookings found</td></tr>
            ) : (
              bookings.map((b) => (
                <tr key={b._id} onClick={() => onRowClick(b)}>
                  <td className="fw-bold">{b.bookingId || b._id?.slice(0, 8)}</td>
                  <td>{b.guestName || "N/A"}</td>
                  <td>{b.roomNumber || "N/A"}</td>
                  <td>{new Date(b.checkInDate).toLocaleDateString()}</td>
                  <td>{new Date(b.checkOutDate).toLocaleDateString()}</td>
                  <td><span className={`modern-badge ${getStatusClass(b.status)}`}>{b.status || "unknown"}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CheckInScanner({ onClose, onSuccess }) {
  const [bookingId, setBookingId] = useState("");
  const [scanData, setScanData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completeLoading, setCompleteLoading] = useState(false);
  const [completeData, setCompleteData] = useState({ bookingId: "", parkingPreference: "", luggageCount: 0, foodPreference: "" });

  async function handleScan(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await scanBooking(bookingId);
      setScanData(res.data?.data || res.data);
      setCompleteData({ ...completeData, bookingId });
    } catch (err) {
      setError(err.response?.data?.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(e) {
    e.preventDefault();
    setError(""); setCompleteLoading(true);
    try {
      const res = await completeCheckIn(completeData);
      if (res.data?.success) {
        setScanData(null); setBookingId("");
        setCompleteData({ bookingId: "", parkingPreference: "", luggageCount: 0, foodPreference: "" });
        onSuccess?.();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Check-in complete failed");
    } finally {
      setCompleteLoading(false);
    }
  }

  return (
    <div className="modern-card mb-4 border-highlight-success">
      <div className="modern-card-header d-flex justify-content-between">
        <h5>Check-in Scanner</h5>
        <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
      </div>
      <div className="modern-card-body">
        {error && <div className="modern-alert modern-alert-danger">{error}</div>}
        {!scanData ? (
          <form onSubmit={handleScan}>
            <div className="mb-3">
              <label className="form-label">Booking ID</label>
              <input type="text" className="modern-input" value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="Enter booking ID" required />
            </div>
            <button type="submit" className="modern-btn modern-btn-success" disabled={loading}>{loading ? "Scanning..." : "Scan"}</button>
          </form>
        ) : (
          <form onSubmit={handleComplete}>
            <div className="modern-alert modern-alert-info">
              <strong>Guest:</strong> {scanData.guestName || "N/A"}<br />
              <strong>Room:</strong> {scanData.roomNumber || "N/A"}
            </div>
            <div className="mb-3">
              <label className="form-label">Parking Preference</label>
              <input type="text" className="modern-input" value={completeData.parkingPreference} onChange={(e) => setCompleteData({ ...completeData, parkingPreference: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Luggage Count</label>
              <input type="number" className="modern-input" min="0" value={completeData.luggageCount} onChange={(e) => setCompleteData({ ...completeData, luggageCount: parseInt(e.target.value) })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Food Preference</label>
              <input type="text" className="modern-input" value={completeData.foodPreference} onChange={(e) => setCompleteData({ ...completeData, foodPreference: e.target.value })} />
            </div>
            <div className="d-flex gap-2 mt-3">
              <button type="submit" className="modern-btn modern-btn-success" disabled={completeLoading}>{completeLoading ? "Completing..." : "Complete Check-in"}</button>
              <button type="button" className="modern-btn modern-btn-secondary" onClick={() => { setScanData(null); setBookingId(""); }}>Reset</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function CheckoutPanel({ onClose, onSuccess }) {
  const [bookingId, setBookingId] = useState("");
  const [checkoutData, setCheckoutData] = useState({ bookingId: "", checkoutMode: "standard", maintenanceDetails: "", complaintDetails: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await checkoutBooking(checkoutData);
      if (res.data?.success) {
        setCheckoutData({ bookingId: "", checkoutMode: "standard", maintenanceDetails: "", complaintDetails: "" });
        setBookingId(""); onSuccess?.();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modern-card mb-4 border-highlight-warning">
      <div className="modern-card-header d-flex justify-content-between">
        <h5>Checkout Panel</h5>
        <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
      </div>
      <div className="modern-card-body">
        {error && <div className="modern-alert modern-alert-danger">{error}</div>}
        <form onSubmit={handleCheckout}>
          <div className="mb-3">
            <label className="form-label">Booking ID</label>
            <input type="text" className="modern-input" value={bookingId} onChange={(e) => { setBookingId(e.target.value); setCheckoutData({ ...checkoutData, bookingId: e.target.value }); }} placeholder="Enter booking ID" required />
          </div>
          <div className="mb-3">
            <label className="form-label">Checkout Mode</label>
            <select className="modern-input" value={checkoutData.checkoutMode} onChange={(e) => setCheckoutData({ ...checkoutData, checkoutMode: e.target.value })}>
              <option value="standard">Standard</option>
              <option value="expedited">Expedited</option>
              <option value="late">Late Checkout</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Maintenance Details</label>
            <textarea className="modern-input" rows="2" value={checkoutData.maintenanceDetails} onChange={(e) => setCheckoutData({ ...checkoutData, maintenanceDetails: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Complaint Details</label>
            <textarea className="modern-input" rows="2" value={checkoutData.complaintDetails} onChange={(e) => setCheckoutData({ ...checkoutData, complaintDetails: e.target.value })} />
          </div>
          <button type="submit" className="modern-btn modern-btn-warning" disabled={loading}>{loading ? "Processing..." : "Process Checkout"}</button>
        </form>
      </div>
    </div>
  );
}

function BookingMetricsSummary({ metrics }) {
  if (!metrics) return null;

  const StatCard = ({ label, value, variant = "primary" }) => (
    <div className="col-md-6 col-lg-3 mb-3">
      <div className={`metric-card metric-card-${variant}`}>
        <p className="metric-label">{label}</p>
        <h4 className="metric-value">{value}</h4>
      </div>
    </div>
  );

  return (
    <div className="modern-card mb-4">
      <div className="modern-card-header">
        <h5>Booking Metrics</h5>
      </div>
      <div className="modern-card-body">
        <div className="row">
          <StatCard label="Total Bookings" value={metrics.totalBookings} variant="primary" />
          <StatCard label="Today" value={metrics.bookingsToday} variant="info" />
          <StatCard label="Upcoming Check-ins" value={metrics.upcomingCheckIns} variant="success" />
          <StatCard label="Upcoming Check-outs" value={metrics.upcomingCheckOuts} variant="warning" />
        </div>
      </div>
    </div>
  );
}

function BookingDetailDrawer({ booking, onClose }) {
  const [roomSnapshot, setRoomSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!booking) return;
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await getRoomSnapshot(booking._id);
        if (mounted) setRoomSnapshot(res.data?.snapshot || res.data);
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || "Failed to load room snapshot");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [booking]);

  if (!booking) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="booking-drawer active">
        <div className="drawer-header">
          <h5>Booking Details</h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
        </div>
        <div className="drawer-body">
          {error && <div className="modern-alert modern-alert-danger">{error}</div>}

          <div className="detail-group">
            <label>Booking ID</label>
            <p>{booking.bookingId || booking._id?.slice(0, 8)}</p>
          </div>
          <div className="detail-group">
            <label>Guest Information</label>
            <p>{booking.guestName || "N/A"}<br />{booking.guestEmail}<br />{booking.guestPhone}</p>
          </div>
          <div className="detail-group">
            <label>Stay Dates</label>
            <p>{new Date(booking.checkInDate).toLocaleDateString()} to {new Date(booking.checkOutDate).toLocaleDateString()}</p>
          </div>

          <hr className="my-4" />
          <h6>Room Snapshot</h6>
          
          {loading ? (
            <div className="text-muted">Loading snapshot...</div>
          ) : roomSnapshot ? (
            <div className="snapshot-box">
              <p><strong>Room:</strong> {roomSnapshot.roomNumber || "N/A"}</p>
              <p><strong>Type:</strong> {roomSnapshot.roomType || "N/A"}</p>
              <p><strong>Status:</strong> <span className="modern-badge badge-checked-in">{roomSnapshot.occupancyStatus || "N/A"}</span></p>
            </div>
          ) : (
            <div className="text-muted">No room data available</div>
          )}
        </div>
      </div>
    </>
  );
}

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [bookingMetrics, setBookingMetrics] = useState(null);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadBookings() {
      setLoading(true); setError("");
      try {
        const [metricsRes, listRes] = await Promise.all([getBookings(), getBookingsList()]);
        if (mounted) {
          setBookingMetrics(metricsRes.data?.data?.bookings || {});
          setBookings(listRes.data?.data?.bookings || []);
        }
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || err.message || "Failed to load bookings");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadBookings();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const filtered = bookings.filter(b => (b.guestName || "").toLowerCase().includes(searchTerm.toLowerCase()) || (b.bookingId || "").includes(searchTerm));
    setFilteredBookings(filtered);
  }, [searchTerm, bookings]);

  return (
    <div className="bookings-page p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0 fw-bold">Bookings Manager</h2>
          <p className="text-muted mb-0">Manage reservations, check-ins, and checkouts.</p>
        </div>
        <div className="d-flex gap-2">
          <button className={`modern-btn ${showScanner ? 'modern-btn-secondary' : 'modern-btn-success'}`} onClick={() => setShowScanner(!showScanner)}>
            {showScanner ? "Close Scanner" : "Check-in Scanner"}
          </button>
          <button className={`modern-btn ${showCheckout ? 'modern-btn-secondary' : 'modern-btn-warning'}`} onClick={() => setShowCheckout(!showCheckout)}>
            {showCheckout ? "Close Checkout" : "Checkout Panel"}
          </button>
        </div>
      </div>

      {error && <div className="modern-alert modern-alert-danger">{error}</div>}
      {loading && <div className="modern-alert modern-alert-info">Loading booking data...</div>}

      <BookingMetricsSummary metrics={bookingMetrics} />

      {showScanner && <CheckInScanner onClose={() => setShowScanner(false)} />}
      {showCheckout && <CheckoutPanel onClose={() => setShowCheckout(false)} />}

      <NewBookingForm />

      <div className="mb-4">
        <input type="text" className="modern-search-input" placeholder="Search by guest name or booking ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <BookingTable bookings={filteredBookings} onRowClick={(b) => setSelectedBooking(b)} />

      {selectedBooking && <BookingDetailDrawer booking={selectedBooking} onClose={() => setSelectedBooking(null)} />}
    </div>
  );
}