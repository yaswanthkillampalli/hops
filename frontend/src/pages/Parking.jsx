import { useEffect, useState } from "react";
import {
  allocateParking,
  completeVehicleDelivery,
  getAvailableParkingSlots,
  getParkingByBooking,
  getParkingByVehicle,
  requestVehicleRetrieval,
  updateParkingStatus,
} from "../api";
import "../styles/Parking.css"; // Ensure this matches your CSS path

const statusColors = {
  available: "badge-success",
  reserved: "badge-warning",
  occupied: "badge-danger",
  blocked: "badge-dark",
  maintenance: "badge-secondary",
  retrieval_requested: "badge-info",
};

const vehicleTypeOptions = ["bike", "car", "suv", "van", "electric", "other"];

function MetricCard({ label, value, color = "primary" }) {
  return (
    <div className="col-md-3 col-sm-6">
      <div className={`metric-card metric-card-${color}`}>
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
      </div>
    </div>
  );
}

function SlotGrid({ slots }) {
  const slotsByZone = {};
  const slotsByFloor = {};
  let totalSlots = 0;
  let occupiedCount = 0;
  let reservedCount = 0;
  let maintenanceCount = 0;

  slots.forEach((slot) => {
    totalSlots++;
    const zone = slot.zone || "Default";
    const floor = slot.floor || 0;

    if (!slotsByZone[zone]) slotsByZone[zone] = [];
    slotsByZone[zone].push(slot);

    if (!slotsByFloor[floor]) slotsByFloor[floor] = [];
    slotsByFloor[floor].push(slot);

    if (slot.isVIPSlot) reservedCount++;
  });

  const availableCount = totalSlots - occupiedCount - reservedCount - maintenanceCount;
  const occupancyRate = totalSlots > 0 ? Math.round(((occupiedCount + reservedCount) / totalSlots) * 100) : 0;

  return (
    <>
      <div className="row g-3 mb-4">
        <MetricCard label="Total Slots" value={totalSlots} color="primary" />
        <MetricCard label="Available" value={availableCount} color="success" />
        <MetricCard label="Occupied" value={occupiedCount} color="danger" />
        <MetricCard label="VIP Slots" value={reservedCount} color="warning" />
      </div>

      <div className="modern-card mb-4">
        <div className="modern-card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Live Slot Availability</h5>
          <span className="modern-badge badge-secondary font-monospace">Occupancy: {occupancyRate}%</span>
        </div>
        <div className="modern-card-body bg-light">
          {Object.entries(slotsByZone).map(([zone, zoneSlots]) => (
            <div key={zone} className="mb-4 last-mb-none">
              <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                <h6 className="text-muted text-uppercase mb-0 fw-bold">Zone {zone}</h6>
                <small className="text-muted fw-medium">Floor {zoneSlots[0]?.floor || 0}</small>
              </div>
              <div className="d-flex flex-wrap gap-3">
                {zoneSlots.map((slot) => (
                  <div
                    key={slot.parkingId}
                    className={`parking-bay ${slot.isVIPSlot ? "parking-bay-vip" : "parking-bay-available"}`}
                    title={`${slot.slotNumber}${slot.isVIPSlot ? " - VIP" : " - Available"}`}
                  >
                    <div className="bay-number">{slot.slotNumber}</div>
                    <div className="bay-status">{slot.isVIPSlot ? "VIP" : "FREE"}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ParkingCard({ parking, onRequestVehicle, onComplete, onUpdateStatus, updating }) {
  const status = parking.status || "available";
  const badgeClass = statusColors[status] || "badge-secondary";
  const isUpdating = updating[parking.parkingId];

  return (
    <div className={`parking-record-card border-highlight-${status === "retrieval_requested" ? "info" : "dark"}`}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          <h5 className="mb-0 fw-bold text-dark text-uppercase">{parking.vehicleNumber || parking.slotNumber || "N/A"}</h5>
          <div className="text-muted small fw-medium mt-1">
            Slot {parking.slotNumber || "N/A"} <span className="mx-1">•</span> <span className="text-capitalize">{parking.vehicleType || "Vehicle"}</span>
          </div>
        </div>
        <span className={`modern-badge ${badgeClass}`}>{status.replace('_', ' ')}</span>
      </div>
      
      <div className="row mt-3 mb-3">
        <div className="col-6">
          <div className="detail-label">Guest</div>
          <div className="detail-value">{parking.guestName || parking.guest || "N/A"}</div>
        </div>
        <div className="col-6">
          <div className="detail-label">Location</div>
          <div className="detail-value">Zone {parking.zone || "-"} / Flr {parking.floor || "-"}</div>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-end pt-3 border-top">
        <div className="small text-muted font-monospace">
          {parking.bookingId ? `BKG: ${parking.bookingId}` : "No Booking ID"}
        </div>
        <div className="d-flex gap-2">
          {status === "occupied" && parking.bookingId && (
            <button
              className="modern-btn modern-btn-outline modern-btn-sm"
              onClick={() => onRequestVehicle(parking.bookingId)}
              disabled={isUpdating}
            >
              {isUpdating ? "..." : "Request Valet"}
            </button>
          )}
          {status === "retrieval_requested" && (
            <button
              className="modern-btn modern-btn-success modern-btn-sm"
              onClick={() => onComplete(parking.parkingId)}
              disabled={isUpdating}
            >
              {isUpdating ? "..." : "Confirm Handover"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Parking() {
  const [slots, setSlots] = useState([]);
  const [parkingRecords, setParkingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [allocateForm, setAllocateForm] = useState({ bookingId: "", vehicleNumber: "", vehicleType: "car" });
  const [allocateLoading, setAllocateLoading] = useState(false);
  
  const [vehicleLookupInput, setVehicleLookupInput] = useState("");
  const [vehicleDetails, setVehicleDetails] = useState(null);
  const [vehicleLookupLoading, setVehicleLookupLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState("");
  
  const [updating, setUpdating] = useState({});

  async function loadSlots() {
    setLoading(true); setError("");
    try {
      const res = await getAvailableParkingSlots();
      setSlots(res.data?.slots || []);
    } catch (err) { setError(err.response?.data?.message || err.message || "Failed to load slots"); } finally { setLoading(false); }
  }

  async function loadParkingRecords() {
    try {
      const res = await getAvailableParkingSlots();
      const active = (res.data?.slots || []).filter((s) => s.status === "occupied" || s.status === "retrieval_requested");
      setParkingRecords(active);
    } catch (err) { console.error("Failed to load parking records"); }
  }

  useEffect(() => { loadSlots(); loadParkingRecords(); }, []);

  async function handleAllocateParking(e) {
    e.preventDefault(); setAllocateLoading(true); setError("");
    try {
      await allocateParking(allocateForm);
      setAllocateForm({ bookingId: "", vehicleNumber: "", vehicleType: "car" });
      await loadSlots(); await loadParkingRecords();
    } catch (err) { setError(err.response?.data?.message || err.message || "Failed to allocate parking"); } finally { setAllocateLoading(false); }
  }

  async function handleVehicleLookup(e) {
    e.preventDefault(); if (!vehicleLookupInput.trim()) return;
    setVehicleLookupLoading(true); setVehicleError(""); setVehicleDetails(null);
    try {
      const res = await getParkingByVehicle(vehicleLookupInput.toUpperCase());
      setVehicleDetails(res.data?.parking || null);
    } catch (err) { setVehicleError(err.response?.data?.message || err.message || "Vehicle not found"); } finally { setVehicleLookupLoading(false); }
  }

  async function handleRequestVehicle(bookingId) {
    const parkingId = parkingRecords.find((p) => p.bookingId === bookingId)?.parkingId;
    if (!parkingId) return;
    setUpdating((prev) => ({ ...prev, [parkingId]: true }));
    try {
      await requestVehicleRetrieval(bookingId);
      await loadSlots(); await loadParkingRecords();
    } catch (err) { setError(err.response?.data?.message || err.message || "Failed to request vehicle"); } finally { setUpdating((prev) => ({ ...prev, [parkingId]: false })); }
  }

  async function handleCompleteDelivery(parkingId) {
    setUpdating((prev) => ({ ...prev, [parkingId]: true }));
    try {
      await completeVehicleDelivery(parkingId);
      await loadSlots(); await loadParkingRecords();
    } catch (err) { setError(err.response?.data?.message || err.message || "Failed to complete delivery"); } finally { setUpdating((prev) => ({ ...prev, [parkingId]: false })); }
  }

  async function handleUpdateStatus(parkingId, newStatus) {
    setUpdating((prev) => ({ ...prev, [parkingId]: true }));
    try {
      await updateParkingStatus(parkingId, newStatus);
      await loadSlots(); await loadParkingRecords();
    } catch (err) { setError(err.response?.data?.message || err.message || "Failed to update status"); } finally { setUpdating((prev) => ({ ...prev, [parkingId]: false })); }
  }

  return (
    <div className="parking-page p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="mb-1 fw-bold">Valet & Parking Hub</h2>
          <div className="text-muted">Allocate slots, trigger valet retrievals, and monitor garage capacity.</div>
        </div>
        <button className="modern-btn modern-btn-outline" onClick={() => { loadSlots(); loadParkingRecords(); }} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Dashboard"}
        </button>
      </div>

      {error && <div className="modern-alert modern-alert-danger">{error}</div>}

      <div className="row g-4">
        <div className="col-12 col-xl-7">
          {slots.length > 0 && <SlotGrid slots={slots} />}

          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h5 className="mb-0">Allocate New Slot</h5>
            </div>
            <div className="modern-card-body">
              <form onSubmit={handleAllocateParking}>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="modern-label">Booking ID</label>
                    <input className="modern-input font-monospace" value={allocateForm.bookingId} onChange={(e) => setAllocateForm((prev) => ({ ...prev, bookingId: e.target.value }))} required />
                  </div>
                  <div className="col-md-4">
                    <label className="modern-label">License Plate</label>
                    <input className="modern-input text-uppercase" placeholder="ABC-1234" value={allocateForm.vehicleNumber} onChange={(e) => setAllocateForm((prev) => ({ ...prev, vehicleNumber: e.target.value }))} required />
                  </div>
                  <div className="col-md-4">
                    <label className="modern-label">Vehicle Type</label>
                    <select className="modern-input text-capitalize" value={allocateForm.vehicleType} onChange={(e) => setAllocateForm((prev) => ({ ...prev, vehicleType: e.target.value }))}>
                      {vehicleTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-top">
                  <button className="modern-btn modern-btn-primary" type="submit" disabled={allocateLoading}>
                    {allocateLoading ? "Allocating..." : "Issue Parking Ticket"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h5 className="mb-0">Locate Vehicle</h5>
            </div>
            <div className="modern-card-body bg-light">
              <form onSubmit={handleVehicleLookup} className="mb-3">
                <div className="d-flex gap-2">
                  <input className="modern-input text-uppercase flex-grow-1" placeholder="Enter License Plate..." value={vehicleLookupInput} onChange={(e) => setVehicleLookupInput(e.target.value)} />
                  <button className="modern-btn modern-btn-primary" type="submit" disabled={vehicleLookupLoading}>
                    {vehicleLookupLoading ? "Searching..." : "Search"}
                  </button>
                </div>
              </form>
              {vehicleError && <div className="modern-alert modern-alert-danger mb-0">{vehicleError}</div>}
              
              {vehicleDetails && (
                <div className="parking-record-card mt-3 mb-0 border-highlight-success shadow-none">
                  <div className="row g-3">
                    <div className="col-md-4"><div className="detail-label">Plate</div><div className="detail-value text-uppercase">{vehicleDetails.vehicleNumber}</div></div>
                    <div className="col-md-4"><div className="detail-label">Type</div><div className="detail-value text-capitalize">{vehicleDetails.vehicleType}</div></div>
                    <div className="col-md-4"><div className="detail-label">Location</div><div className="detail-value">Slot {vehicleDetails.slotNumber} (Z:{vehicleDetails.zone})</div></div>
                    <div className="col-md-4"><div className="detail-label">Status</div><span className={`modern-badge ${statusColors[vehicleDetails.status] || "badge-secondary"}`}>{vehicleDetails.status}</span></div>
                    <div className="col-md-4"><div className="detail-label">Guest</div><div className="detail-value">{vehicleDetails.guestName || "-"}</div></div>
                    <div className="col-md-4"><div className="detail-label">Booking</div><div className="detail-value font-monospace">{vehicleDetails.bookingId || "-"}</div></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="modern-card sticky-top" style={{ top: '24px', zIndex: 1 }}>
            <div className="modern-card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Valet Action Board</h5>
              {parkingRecords.length > 0 && (
                <span className="modern-badge badge-primary">{parkingRecords.length} Active</span>
              )}
            </div>
            <div className="modern-card-body bg-light">
              <p className="text-muted small mb-3">Manage vehicles currently stored in the facility or pending retrieval for checkout.</p>
              
              {parkingRecords.length === 0 ? (
                <div className="text-muted py-5 text-center bg-white rounded-3 border">
                  <span className="fs-2 d-block mb-3">🚘</span>
                  The facility is currently empty.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {parkingRecords.map((parking) => (
                    <ParkingCard
                      key={parking.parkingId}
                      parking={parking}
                      onRequestVehicle={handleRequestVehicle}
                      onComplete={handleCompleteDelivery}
                      onUpdateStatus={handleUpdateStatus}
                      updating={updating}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-12">
          <div className="modern-card">
            <div className="modern-card-header">
              <h5 className="mb-0">System Operations Guide</h5>
            </div>
            <div className="modern-card-body bg-light">
              <div className="row g-4">
                <div className="col-md-6">
                  <div className="workflow-box">
                    <h6 className="text-primary fw-bold mb-3">Arrival & Allocation</h6>
                    <ol className="modern-list">
                      <li>Guest arrives with their vehicle at the portico.</li>
                      <li>Attendant fills the <strong>Allocate Slot Form</strong> using the Booking ID.</li>
                      <li>System selects optimal space and updates slot to <span className="modern-badge badge-danger">Occupied</span>.</li>
                    </ol>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="workflow-box">
                    <h6 className="text-info fw-bold mb-3">Departure & Retrieval</h6>
                    <ol className="modern-list">
                      <li>Guest requests vehicle via checkout or front desk.</li>
                      <li>Staff clicks <strong>Request Valet</strong> on the Action Board.</li>
                      <li>Valet retrieves car. Staff clicks <strong>Confirm Handover</strong> to free the slot.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}