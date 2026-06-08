const express = require("express");
const cors = require("cors");

const gatewayRoutes = require("./routes/gateway.routes");
const readingRoutes = require("./routes/reading.routes");
const alertRoutes = require("./routes/alert.routes");
const commandRoutes = require("./routes/command.routes");
const deviceRoutes = require("./routes/device.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running"
  });
});

app.use("/api/gateway", gatewayRoutes);
app.use("/api/readings", readingRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/commands", commandRoutes);
app.use("/api/devices", deviceRoutes);

module.exports = app;