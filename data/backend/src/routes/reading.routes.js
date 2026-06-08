const express = require("express");
const router = express.Router();
const {
  getLatestReadings,
  getReadingHistory
} = require("../controllers/reading.controller");

router.get("/latest", getLatestReadings);
router.get("/history", getReadingHistory);

module.exports = router;