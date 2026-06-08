const pool = require("../config/db");
const { normalizeText, normalizeUpper } = require("../utils/parsers");
const { isMockMode } = require("../config/runtime");
const mockStore = require("../data/mock-store");

async function createCommand(req, res) {
  try {
    if (isMockMode) {
      const result = mockStore.createCommand(req.body);

      if (result.error) {
        return res.status(result.status).json({
          success: false,
          message: result.error
        });
      }

      return res.json({
        success: true,
        data: result.data
      });
    }

    const { device_code, command_type, command_value, issued_by } = req.body;

    const deviceCode = normalizeText(device_code);
    const commandType = normalizeUpper(command_type);

    if (!deviceCode || !commandType) {
      return res.status(400).json({
        success: false,
        message: "device_code and command_type are required"
      });
    }

    const deviceResult = await pool.query(
      `SELECT id FROM devices WHERE device_code = $1`,
      [deviceCode]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    const deviceId = deviceResult.rows[0].id;

    const result = await pool.query(
      `INSERT INTO device_commands
       (device_id, issued_by, command_type, command_value, status, created_at)
       VALUES ($1, $2, $3, $4, 'PENDING', NOW())
       RETURNING *`,
      [deviceId, normalizeText(issued_by), commandType, normalizeText(command_value)]
    );

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}

async function getPendingCommand(req, res) {
  try {
    const deviceCode = normalizeText(req.query.device_code);

    if (!deviceCode) {
      return res.status(400).json({
        success: false,
        message: "device_code is required"
      });
    }

    if (isMockMode) {
      return res.json({
        success: true,
        data: mockStore.getPendingCommand(deviceCode)
      });
    }

    const result = await pool.query(
      `SELECT
          c.id AS command_id,
          d.device_code,
          c.command_type,
          c.command_value,
          c.status,
          c.created_at
       FROM device_commands c
       JOIN devices d ON d.id = c.device_id
       WHERE d.device_code = $1
         AND c.status = 'PENDING'
       ORDER BY c.created_at ASC
       LIMIT 1`,
      [deviceCode]
    );

    return res.json({
      success: true,
      data: result.rows[0] || null
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}

module.exports = {
  createCommand,
  getPendingCommand
};
