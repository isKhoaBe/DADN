const pool = require("../config/db");
const { normalizeText } = require("../utils/parsers");
const { isMockMode } = require("../config/runtime");
const mockStore = require("../data/mock-store");

async function getLatestReadings(req, res) {
  try {
    if (isMockMode) {
      return res.json({
        success: true,
        data: mockStore.getLatestReadings()
      });
    }

    const result = await pool.query(
      `SELECT DISTINCT ON (d.id)
          d.device_code,
          d.device_name,
          d.device_type,
          d.room_name,
          sr.temperature,
          sr.humidity,
          sr.light_level,
          sr.ir_detected,
          sr.anomaly_flag,
          sr.status_label,
          sr.latitude,
          sr.longitude,
          sr.recorded_at
       FROM devices d
       LEFT JOIN sensor_readings sr ON sr.device_id = d.id
       ORDER BY d.id, sr.recorded_at DESC`
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}

async function getReadingHistory(req, res) {
  try {
    const deviceCode = normalizeText(req.query.device_code);
    const limit = Math.min(Number(req.query.limit) || 50, 500);

    if (!deviceCode) {
      return res.status(400).json({
        success: false,
        message: "device_code is required"
      });
    }

    if (isMockMode) {
      return res.json({
        success: true,
        data: mockStore.getReadingHistory(deviceCode, limit)
      });
    }

    const result = await pool.query(
      `SELECT
          d.device_code,
          d.device_name,
          sr.temperature,
          sr.humidity,
          sr.light_level,
          sr.ir_detected,
          sr.anomaly_flag,
          sr.status_label,
          sr.latitude,
          sr.longitude,
          sr.recorded_at
       FROM sensor_readings sr
       JOIN devices d ON d.id = sr.device_id
       WHERE d.device_code = $1
       ORDER BY sr.recorded_at DESC
       LIMIT $2`,
      [deviceCode, limit]
    );

    return res.json({
      success: true,
      data: result.rows
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
  getLatestReadings,
  getReadingHistory
};
