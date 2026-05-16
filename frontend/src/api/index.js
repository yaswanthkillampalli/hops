import axios from "axios";
import { getToken, removeToken } from "../utils/auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// attach Authorization header when token exists
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If server responds 401, clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      removeToken();
      try {
        window.location.href = "/admin/login";
      } catch (e) {}
    }
    return Promise.reject(err);
  }
);

export async function getOverview() {
  return api.get("/api/v1/admin/overview");
}

export async function getAnalyticsMetrics() {
  return api.get("/api/v1/admin/metrics");
}

export async function getBookings(params) {
  return api.get("/api/v1/admin/bookings", { params });
}

export async function getBookingsList() {
  return api.get("/api/v1/admin/bookings/list");
}

export async function getRevenue() {
  return api.get("/api/v1/admin/revenue");
}

export async function getOpenTasks() {
  return api.get("/api/v1/task", { params: { status: "open" } });
}

export async function getComplaints(params) {
  return api.get("/api/v1/admin/complaints", { params });
}

export async function getMaintenance(params) {
  return api.get("/api/v1/admin/maintenance", { params });
}

export async function getComplaintsList() {
  return api.get("/api/v1/complaint");
}

export async function getComplaintsByBooking(bookingId) {
  return api.get(`/api/v1/complaint/${bookingId}`);
}

export async function createComplaint(data) {
  return api.post("/api/v1/complaint/create", data);
}

export async function resolveComplaint(complaintId, resolutionNotes) {
  return api.patch(`/api/v1/complaint/resolve/${complaintId}`, { resolutionNotes });
}

export async function getMaintenanceList() {
  return api.get("/api/v1/maintenance");
}

export async function getMaintenanceByBooking(bookingId) {
  return api.get(`/api/v1/maintenance/${bookingId}`);
}

export async function createMaintenance(data) {
  return api.post("/api/v1/maintenance/create", data);
}

export async function resolveMaintenance(maintenanceRequestId, resolutionNotes) {
  return api.patch(`/api/v1/maintenance/resolve/${maintenanceRequestId}`, { resolutionNotes });
}

export async function getAvailableParkingSlots() {
  return api.get("/api/v1/parking/available-slots");
}

export async function getParkingByVehicle(vehicleNumber) {
  return api.get(`/api/v1/parking/vehicle/${vehicleNumber}`);
}

export async function getParkingByBooking(bookingId) {
  return api.get(`/api/v1/parking/${bookingId}`);
}

export async function allocateParking(data) {
  return api.post("/api/v1/parking/allocate", data);
}

export async function updateParkingStatus(parkingId, status) {
  return api.patch("/api/v1/parking/status", { parkingId, status });
}

export async function requestVehicleRetrieval(bookingId) {
  return api.post("/api/v1/parking/request-vehicle", { bookingId });
}

export async function completeVehicleDelivery(parkingId) {
  return api.patch("/api/v1/parking/complete", { parkingId });
}

export async function getStaffAnalytics() {
  return api.get("/api/v1/admin/staff");
}

export async function registerStaffMember(data) {
  return api.post("/api/v1/staff/register", data);
}

export async function registerBusinessAdmin(data) {
  return api.post("/api/v1/business/register", data);
}

export async function getMyStaffProfile() {
  return api.get("/api/v1/staff/me");
}

export async function sendTelegramMessage(data) {
  return api.post("/api/v1/telegram/send-message", data);
}

export async function getTaskMetrics() {
  return api.get("/api/v1/admin/tasks");
}

export async function getTasks(params) {
  return api.get("/api/v1/task", { params });
}

export async function getTaskByTaskId(taskId) {
  return api.get(`/api/v1/task/${taskId}`);
}

export async function createTask(data) {
  return api.post("/api/v1/task/create", data);
}

export async function assignTask(data) {
  return api.patch("/api/v1/task/assign", data);
}

export async function updateTaskStatus(data) {
  return api.patch("/api/v1/task/status", data);
}

export async function completeTask(data) {
  return api.patch("/api/v1/task/complete", data);
}

export async function getRoomsList() {
  return api.get("/api/v1/room/list");
}

// Booking endpoints
export async function createBooking(data) {
  return api.post("/api/v1/booking/create", data);
}

export async function scanBooking(bookingId) {
  return api.post("/api/v1/checkin/scan", { bookingId });
}

export async function completeCheckIn(data) {
  return api.post("/api/v1/checkin/complete", data);
}

export async function getRoomSnapshot(bookingId) {
  return api.get(`/api/v1/room/${bookingId}`);
}

export async function checkoutBooking(data) {
  return api.post("/api/v1/room/checkout", data);
}

export async function createFoodOrder(data) {
  return api.post("/api/v1/food-order/create", data);
}

export async function updateFoodOrderTiming(data) {
  return api.put("/api/v1/food-order/update-timing", data);
}

export default api;
