const pool = require("../config/db");
const { isMockMode } = require("../config/runtime");
const mockStore = require("../data/mock-store");

async function getDevices(req, res) {
  try {
    if (isMockMode) {
      return res.json({
        success: true,
        data: mockStore.getDevices()
      });
    }

    const result = await pool.query(
      `SELECT
          d.*,
          ds.power_status,
          ds.value_text,
          ds.value_number,
          ds.updated_at
       FROM devices d
       LEFT JOIN device_states ds ON ds.device_id = d.id
       ORDER BY d.id ASC`
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

module.exports = { getDevices };
