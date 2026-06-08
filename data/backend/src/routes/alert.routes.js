const express = require("express");
const router = express.Router();
const {
  getAlerts,
  resolveAlert
} = require("../controllers/alert.controller");

router.get("/", getAlerts);
router.patch("/:id/resolve", resolveAlert);

module.exports = router;