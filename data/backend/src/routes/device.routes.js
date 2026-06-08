const express = require("express");
const router = express.Router();
const { getDevices } = require("../controllers/device.controller");

router.get("/", getDevices);

module.exports = router;