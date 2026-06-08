const express = require("express");
const router = express.Router();
const {
  getDashboardOverview,
  receiveReading,
  updateDeviceStatus,
  updateCommandResult
} = require("../controllers/gateway.controller");

router.get("/overview", getDashboardOverview);
router.post("/readings", receiveReading);
router.post("/device-status", updateDeviceStatus);
router.post("/command-result", updateCommandResult);

module.exports = router;
