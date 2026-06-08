const pool = require("../config/db");
const { parseNumber, parseBoolean, normalizeText, normalizeUpper } = require("../utils/parsers");
const { buildAlerts } = require("../utils/thresholds");
const { pushReadingToAdafruit } = require("../services/adafruit.service");
const { isMockMode } = require("../config/runtime");
const mockStore = require("../data/mock-store");

const PRIMARY_SENSOR_DEVICE_CODE = process.env.PRIMARY_SENSOR_DEVICE_CODE || "YB_01";
const ACTUATOR_DEVICE_CODES = ["DOOR_LOCK", "LIVING_LIGHTS", "HVAC_FAN"];

function toDisplayTime(timestamp) {
  let ts = timestamp;
  if (typeof ts === 'string' && !ts.endsWith('Z') && !ts.includes('+')) {
    ts += 'Z'; // Treat Postgres TIMESTAMP without timezone as UTC
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(new Date(ts));
}

function isRecent(timestamp, maxMinutes = 10) {
  if (!timestamp) {
    return false;
  }

  return Date.now() - new Date(timestamp).getTime() <= maxMinutes * 60 * 1000;
}

function formatTrend(current, previous, suffix) {
  if (current === null || previous === null) {
    return {
      trendValue: "No change",
      trendDirection: "up"
    };
  }

  const diff = Number(current) - Number(previous);
  const sign = diff > 0 ? "+" : "";

  return {
    trendValue: `${sign}${diff.toFixed(1)}${suffix}`,
    trendDirection: diff >= 0 ? "up" : "down"
  };
}

function buildMetric(historyRows, key, unit, statusTextResolver, suffix) {
  const values = historyRows
    .map((row) => row[key])
    .filter((value) => value !== null && value !== undefined)
    .map(Number);
  const current = values.length > 0 ? values[values.length - 1] : null;
  const previous = values.length > 1 ? values[values.length - 2] : null;

  return {
    value: current,
    unit,
    dataKey: "value",
    history: historyRows.map((row) => ({
      time: toDisplayTime(row.recorded_at),
      value: row[key] === null || row[key] === undefined ? 0 : Number(row[key])
    })),
    statusText: statusTextResolver(current),
    ...formatTrend(current, previous, suffix)
  };
}

function buildSensorCards(latestReading) {
  const recordedAt = latestReading?.recorded_at || null;
  const onlineStatus = isRecent(recordedAt) ? "online" : latestReading ? "offline" : "error";

  return [
    {
      device_code: "TEMP_SENSOR",
      name: "Temperature Sensor",
      status: latestReading?.temperature !== null && latestReading?.temperature !== undefined ? onlineStatus : "error",
      type: "sensor",
      signal: isRecent(recordedAt) ? "strong" : "weak"
    },
    {
      device_code: "HUM_SENSOR",
      name: "Humidity Sensor",
      status: latestReading?.humidity !== null && latestReading?.humidity !== undefined ? onlineStatus : "error",
      type: "sensor",
      signal: isRecent(recordedAt) ? "strong" : "weak"
    },
    {
      device_code: "LIGHT_SENSOR",
      name: "Light Sensor",
      status: latestReading?.light_level !== null && latestReading?.light_level !== undefined ? onlineStatus : "error",
      type: "sensor",
      signal: isRecent(recordedAt) ? "strong" : "weak"
    },
    {
      device_code: "MOTION_SENSOR",
      name: "PIR Motion Sensor",
      status: latestReading?.ir_detected !== null && latestReading?.ir_detected !== undefined ? onlineStatus : "error",
      type: "sensor",
      signal: isRecent(recordedAt) ? "strong" : "weak"
    }
  ];
}

function buildActuatorCards(actuatorRows) {
  return ACTUATOR_DEVICE_CODES.map((deviceCode) => {
    const row = actuatorRows.find((item) => item.device_code === deviceCode);
    const status = !row
      ? "offline"
      : String(row.value_text || "").toLowerCase().includes("maintenance")
        ? "error"
        : "online";

    return {
      device_code: deviceCode,
      name: row?.device_name || deviceCode,
      status,
      type: "actuator",
      signal: status === "online" ? "strong" : "weak",
      state: deviceCode === "DOOR_LOCK"
        ? row?.power_status === "UNLOCKED"
        : row?.power_status === "ON"
    };
  });
}

function buildLogs(alertRows, commandRows, latestReading) {
  const alertLogs = alertRows.map((alert) => {
    let type = "warning";
    if (alert.severity === "error") type = "error";
    if (alert.severity === "success") type = "success";
    if (alert.severity === "info") type = "info";
    if (alert.severity === "routine") type = "routine";
    
    return {
      id: `alert-${alert.id}`,
      time: alert.created_at,
      timeLabel: toDisplayTime(alert.created_at),
      message: alert.message,
      type: type
    };
  });

  const commandLogs = commandRows.map((command) => ({
    id: `command-${command.id}`,
    time: command.created_at,
    timeLabel: toDisplayTime(command.created_at),
    message: `${command.device_name}: ${command.command_type}${command.command_value ? ` ${command.command_value}` : ""}`,
    type: command.status === "FAILED" ? "error" : "routine"
  }));

  const infoLogs = latestReading
    ? [{
        id: "latest-reading",
        time: latestReading.recorded_at,
        timeLabel: toDisplayTime(latestReading.recorded_at),
        message: `Sensor hub updated: T ${Number(latestReading.temperature ?? 0).toFixed(1)} deg C, H ${Number(latestReading.humidity ?? 0).toFixed(1)}%`,
        type: latestReading.anomaly_flag ? "warning" : "info"
      }]
    : [];

  return [...alertLogs, ...commandLogs, ...infoLogs]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 8);
}

async function findPrimarySensorDevice() {
  const exactResult = await pool.query(
    `SELECT id, device_code, device_name
     FROM devices
     WHERE device_code = $1
     LIMIT 1`,
    [PRIMARY_SENSOR_DEVICE_CODE]
  );

  if (exactResult.rows.length > 0) {
    return exactResult.rows[0];
  }

  const fallbackResult = await pool.query(
    `SELECT id, device_code, device_name
     FROM devices
     WHERE device_type = 'gateway_sensor'
     ORDER BY created_at ASC
     LIMIT 1`
  );

  return fallbackResult.rows[0] || null;
}

async function getDashboardOverview(req, res) {
  try {
    if (isMockMode) {
      return res.json({
        success: true,
        data: mockStore.getDashboardOverview()
      });
    }

    const primarySensor = await findPrimarySensorDevice();

    if (!primarySensor) {
      return res.json({
        success: true,
        data: {
          environment: {
            temperature: buildMetric([], "temperature", "deg C", () => "No data", " deg"),
            humidity: buildMetric([], "humidity", "%", () => "No data", "%"),
            light: buildMetric([], "light_level", "Lux", () => "No data", "")
          },
          logs: [],
          sensors: [],
          actuators: [],
          summary: {
            sensorsOnline: 0,
            sensorsIssue: 0,
            actuatorsOnline: 0,
            actuatorsIssue: 0
          },
          alerts: []
        }
      });
    }

    const [latestReadingResult, historyResult, alertsResult, actuatorResult, commandResult] = await Promise.all([
      pool.query(
        `SELECT sr.*, d.device_code, d.device_name
         FROM sensor_readings sr
         JOIN devices d ON d.id = sr.device_id
         WHERE sr.device_id = $1
         ORDER BY sr.recorded_at DESC
         LIMIT 1`,
        [primarySensor.id]
      ),
      pool.query(
        `SELECT sr.*
         FROM sensor_readings sr
         WHERE sr.device_id = $1
         ORDER BY sr.recorded_at DESC
         LIMIT 8`,
        [primarySensor.id]
      ),
      pool.query(
        `SELECT a.id, a.alert_type, a.severity, a.message, a.created_at
         FROM alerts a
         WHERE a.is_resolved = FALSE
         ORDER BY a.created_at DESC
         LIMIT 12`
      ),
      pool.query(
        `SELECT d.device_code, d.device_name, d.last_seen_at, ds.power_status, ds.value_text, ds.value_number, ds.updated_at
         FROM devices d
         LEFT JOIN device_states ds ON ds.device_id = d.id
         WHERE d.device_code = ANY($1::text[])`,
        [ACTUATOR_DEVICE_CODES]
      ),
      pool.query(
        `SELECT c.id, c.command_type, c.command_value, c.status, c.created_at, d.device_name
         FROM device_commands c
         JOIN devices d ON d.id = c.device_id
         ORDER BY c.created_at DESC
         LIMIT 8`
      )
    ]);

    const latestReading = latestReadingResult.rows[0] || null;
    const historyRows = historyResult.rows.reverse();
    const alerts = alertsResult.rows;
    const actuators = buildActuatorCards(actuatorResult.rows);
    const sensors = buildSensorCards(latestReading);
    const logs = buildLogs(alerts, commandResult.rows, latestReading);

    return res.json({
      success: true,
      data: {
        environment: {
          temperature: buildMetric(historyRows, "temperature", "deg C", (value) => value !== null && value >= 35 ? "Hot" : value !== null && value >= 30 ? "Warm" : "Normal", " deg"),
          humidity: buildMetric(historyRows, "humidity", "%", (value) => value !== null && value >= 80 ? "Humid" : "Normal", "%"),
          light: buildMetric(historyRows, "light_level", "Lux", (value) => value !== null && value < 100 ? "Dim" : "Bright", "")
        },
        logs,
        sensors,
        actuators,
        summary: {
          sensorsOnline: sensors.filter((item) => item.status === "online").length,
          sensorsIssue: sensors.filter((item) => item.status !== "online").length,
          actuatorsOnline: actuators.filter((item) => item.status === "online").length,
          actuatorsIssue: actuators.filter((item) => item.status !== "online").length
        },
        alerts: alerts.map((alert) => ({
          id: alert.id,
          message: alert.message,
          severity: alert.severity
        }))
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}

async function receiveReading(req, res) {
  if (isMockMode) {
    try {
      const result = mockStore.receiveReading(req.body);

      if (result.error) {
        return res.status(result.status).json({
          success: false,
          message: result.error
        });
      }

      return res.json({
        success: true,
        message: "Reading saved successfully",
        data: result.data
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  const client = await pool.connect();
  let hasTransaction = false;

  try {
    const { device_code, temperature, humidity } = req.body;
    const deviceCode = normalizeText(device_code);

    if (!deviceCode) {
      return res.status(400).json({
        success: false,
        message: "device_code is required"
      });
    }

    const temp = parseNumber(temperature);
    const hum = parseNumber(humidity);
    const light = parseNumber(req.body.light_level ?? req.body.light);
    const motion = parseBoolean(req.body.ir_detected ?? req.body.motion);
    const anomalyFlag = parseBoolean(
      req.body.anomaly_flag ?? req.body.anomaly ?? req.body.custom_value ?? req.body.customValue
    );
    const latitude = parseNumber(req.body.latitude ?? req.body.lat);
    const longitude = parseNumber(req.body.longitude ?? req.body.long ?? req.body.lng);
    const statusLabel = normalizeUpper(req.body.status_label);

    const deviceResult = await client.query(
      `SELECT id, device_code, device_name FROM devices WHERE device_code = $1`,
      [deviceCode]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    const device = deviceResult.rows[0];

    await client.query("BEGIN");
    hasTransaction = true;

    const insertResult = await client.query(
      `INSERT INTO sensor_readings
       (device_id, temperature, humidity, light_level, ir_detected, anomaly_flag, status_label, latitude, longitude, raw_payload, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING id, recorded_at`,
      [device.id, temp, hum, light, motion, anomalyFlag, statusLabel, latitude, longitude, req.body]
    );

    await client.query(
      `UPDATE devices SET last_seen_at = NOW() WHERE id = $1`,
      [device.id]
    );

    const alerts = buildAlerts({
      temperature: temp,
      humidity: hum,
      lightLevel: light,
      irDetected: motion,
      anomalyFlag
    });

    for (const alert of alerts) {
      await client.query(
        `INSERT INTO alerts (device_id, alert_type, severity, message)
         VALUES ($1, $2, $3, $4)`,
        [device.id, alert.alert_type, alert.severity, alert.message]
      );
    }

    await client.query("COMMIT");
    hasTransaction = false;

    try {
      await pushReadingToAdafruit({
        temperature: temp,
        humidity: hum,
        lightLevel: light,
        irDetected: motion
      });
    } catch (error) {
      console.error("Adafruit push failed:", error.message);
    }

    return res.json({
      success: true,
      message: "Reading saved successfully",
      data: insertResult.rows[0]
    });
  } catch (error) {
    if (hasTransaction) {
      await client.query("ROLLBACK");
    }

    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  } finally {
    client.release();
  }
}

async function updateDeviceStatus(req, res) {
  try {
    if (isMockMode) {
      const result = mockStore.updateDeviceStatus(req.body);

      if (result.error) {
        return res.status(result.status).json({
          success: false,
          message: result.error
        });
      }

      return res.json({
        success: true,
        message: "Device status updated successfully",
        data: result.data
      });
    }

    const { device_code, power_status, value_text, value_number } = req.body;
    const deviceCode = normalizeText(device_code);

    if (!deviceCode) {
      return res.status(400).json({
        success: false,
        message: "device_code is required"
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

    await pool.query(
      `INSERT INTO device_states (device_id, power_status, value_text, value_number, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (device_id)
       DO UPDATE SET
         power_status = EXCLUDED.power_status,
         value_text = EXCLUDED.value_text,
         value_number = EXCLUDED.value_number,
         updated_at = NOW()`,
      [
        deviceId,
        normalizeUpper(power_status, "UNKNOWN"),
        normalizeText(value_text),
        parseNumber(value_number)
      ]
    );

    await pool.query(
      `UPDATE devices SET last_seen_at = NOW() WHERE id = $1`,
      [deviceId]
    );

    return res.json({
      success: true,
      message: "Device status updated successfully"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}

async function updateCommandResult(req, res) {
  try {
    if (isMockMode) {
      const result = mockStore.updateCommandResult(req.body);

      if (result.error) {
        return res.status(result.status).json({
          success: false,
          message: result.error
        });
      }

      return res.json({
        success: true,
        message: "Command updated successfully",
        data: result.data
      });
    }

    const { command_id, status, error_message } = req.body;

    const result = await pool.query(
      `UPDATE device_commands
       SET status = $1,
           error_message = $2,
           executed_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [normalizeUpper(status), normalizeText(error_message), Number(command_id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Command not found"
      });
    }

    return res.json({
      success: true,
      message: "Command updated successfully",
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
  getDashboardOverview,
  receiveReading,
  updateDeviceStatus,
  updateCommandResult
};
