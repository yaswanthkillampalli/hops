const express = require("express");
const cors = require("cors");

const businessRoutes = require("./routes/businessRoutes");
const guestRoutes = require("./routes/guestRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const staffRoutes = require("./routes/staffRoutes");
const telegramRoutes = require("./routes/telegramRoutes");
const checkinRoutes = require("./routes/checkinRoutes");
const parkingRoutes = require("./routes/parkingRoutes");
const luggageRoutes = require("./routes/luggageRoutes");
const taskRoutes = require("./routes/taskRoutes");
const foodOrderRoutes = require("./routes/foodOrderRoutes");
const roomRoutes = require("./routes/roomRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(cors());

app.use(express.json());

app.use("/api/v1/business", businessRoutes);
app.use("/api/v1/guest", guestRoutes);
app.use("/api/v1/booking", bookingRoutes);
app.use("/api/v1/staff", staffRoutes);
app.use("/api/v1/telegram",telegramRoutes);
app.use("/api/v1/checkin", checkinRoutes);
app.use("/api/v1/parking", parkingRoutes);
app.use("/api/v1/luggage", luggageRoutes);
app.use("/api/v1/room", roomRoutes);
app.use("/api/v1/complaint", complaintRoutes);
app.use("/api/v1/maintenance", maintenanceRoutes);
app.use("/api/v1/task", taskRoutes);
app.use("/api/v1/food-order", foodOrderRoutes);
app.use("/api/v1/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("StayOps Backend Running");
});

module.exports = app;