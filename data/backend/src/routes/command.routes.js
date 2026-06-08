const express = require("express");
const router = express.Router();
const {
  createCommand,
  getPendingCommand
} = require("../controllers/command.controller");

router.post("/", createCommand);
router.get("/pending", getPendingCommand);

module.exports = router;