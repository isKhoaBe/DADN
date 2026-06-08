const pool = require("../config/db");
const { isMockMode } = require("../config/runtime");
const mockStore = require("../data/mock-store");

async function getAlerts(req, res) {
  try {
    if (isMockMode) {
      return res.json({
        success: true,
        data: mockStore.getAlerts()
      });
    }

    const result = await pool.query(
      `SELECT a.*, d.device_code, d.device_name
       FROM alerts a
       LEFT JOIN devices d ON d.id = a.device_id
       WHERE a.is_resolved = FALSE
       ORDER BY a.created_at DESC
       LIMIT 50`
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

async function resolveAlert(req, res) {
  try {
    const alertId = Number(req.params.id);

    if (isMockMode) {
      const alert = mockStore.resolveAlert(alertId);

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: "Alert not found"
        });
      }

      return res.json({
        success: true,
        data: alert
      });
    }

    const result = await pool.query(
      `UPDATE alerts
       SET is_resolved = TRUE,
           resolved_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [alertId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Alert not found"
      });
    }

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

module.exports = {
  getAlerts,
  resolveAlert
};
