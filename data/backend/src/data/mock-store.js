const { buildAlerts } = require("../utils/thresholds");
const { normalizeText, normalizeUpper, parseNumber, parseBoolean } = require("../utils/parsers");

function createReadingSeries(values, key, stepMinutes) {
  return values.map((value, index) => {
    const date = new Date(Date.now() - (values.length - 1 - index) * stepMinutes * 60 * 1000);

    return {
      recorded_at: date.toISOString(),
      [key]: value
    };
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toDisplayTime(timestamp) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(new Date(timestamp));
}

const state = {
  devices: [
    {
      id: 1,
      device_code: "TEMP_SENSOR",
      device_name: "Temperature Sensor",
      device_type: "sensor",
      room_name: "Living Room",
      status: "online",
      signal: "strong",
      power_status: "ON",
      value_text: "Monitoring",
      value_number: 26.8,
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      device_code: "HUM_SENSOR",
      device_name: "Humidity Sensor",
      device_type: "sensor",
      room_name: "Living Room",
      status: "error",
      signal: "weak",
      power_status: "ON",
      value_text: "Disconnected",
      value_number: 42,
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      device_code: "LIGHT_SENSOR",
      device_name: "Light Sensor",
      device_type: "sensor",
      room_name: "Living Room",
      status: "online",
      signal: "weak",
      power_status: "ON",
      value_text: "Monitoring",
      value_number: 650,
      updated_at: new Date().toISOString()
    },
    {
      id: 4,
      device_code: "CAMERA_FRONT",
      device_name: "Front Door Camera",
      device_type: "sensor",
      room_name: "Front Door",
      status: "online",
      signal: "strong",
      power_status: "ON",
      value_text: "Streaming",
      value_number: 1,
      updated_at: new Date().toISOString()
    },
    {
      id: 5,
      device_code: "DOOR_LOCK",
      device_name: "Smart Door Lock",
      device_type: "actuator",
      room_name: "Front Door",
      status: "online",
      signal: "strong",
      power_status: "LOCKED",
      value_text: "Locked",
      value_number: 0,
      updated_at: new Date().toISOString()
    },
    {
      id: 6,
      device_code: "LIVING_LIGHTS",
      device_name: "Living Room Lights",
      device_type: "actuator",
      room_name: "Living Room",
      status: "online",
      signal: "strong",
      power_status: "ON",
      value_text: "Lights On",
      value_number: 1,
      updated_at: new Date().toISOString()
    },
    {
      id: 7,
      device_code: "HVAC_FAN",
      device_name: "HVAC Mini Fan",
      device_type: "actuator",
      room_name: "Living Room",
      status: "error",
      signal: "weak",
      power_status: "OFF",
      value_text: "Maintenance Required",
      value_number: 0,
      updated_at: new Date().toISOString()
    }
  ],
  histories: {
    TEMP_SENSOR: createReadingSeries([22.5, 21.0, 23.5, 25.0, 27.5, 25.5, 26.8], "temperature", 60),
    HUM_SENSOR: createReadingSeries([45, 46, 44, 42, 40, 43, 42], "humidity", 60),
    LIGHT_SENSOR: createReadingSeries([0, 0, 250, 800, 650, 150, 650], "light_level", 60),
    CAMERA_FRONT: createReadingSeries([0, 0, 0, 1, 0, 1, 1], "ir_detected", 60)
  },
  alerts: [
    {
      id: 1,
      device_id: 2,
      device_code: "HUM_SENSOR",
      device_name: "Humidity Sensor",
      alert_type: "SENSOR_DISCONNECTED",
      severity: "error",
      message: "Humidity sensor disconnected",
      is_resolved: false,
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      device_id: 1,
      device_code: "TEMP_SENSOR",
      device_name: "Temperature Sensor",
      alert_type: "HIGH_TEMPERATURE",
      severity: "warning",
      message: "Temperature reached 27.5 deg C earlier this afternoon",
      is_resolved: false,
      created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString()
    }
  ],
  activity: [
    {
      id: 1,
      time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      message: "Face recognized: unlocking door",
      type: "success"
    },
    {
      id: 2,
      time: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      message: "Human recognized at front door",
      type: "info"
    },
    {
      id: 3,
      time: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      message: "Living room lights turned on manually",
      type: "routine"
    },
    {
      id: 4,
      time: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      message: "High temperature threshold reached: fan automation suggested",
      type: "warning"
    },
    {
      id: 5,
      time: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      message: "Humidity sensor disconnected",
      type: "error"
    }
  ],
  commands: [],
  nextAlertId: 3,
  nextCommandId: 1,
  nextActivityId: 6
};

function getDeviceByCode(deviceCode) {
  return state.devices.find((device) => device.device_code === deviceCode);
}

function addActivity(message, type) {
  state.activity.unshift({
    id: state.nextActivityId++,
    time: new Date().toISOString(),
    message,
    type
  });
}

function addAlertsForDevice(device, payload) {
  const alerts = buildAlerts(payload);

  alerts.forEach((alert) => {
    state.alerts.unshift({
      id: state.nextAlertId++,
      device_id: device.id,
      device_code: device.device_code,
      device_name: device.device_name,
      alert_type: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      is_resolved: false,
      created_at: new Date().toISOString()
    });
  });

  return alerts;
}

function getLatestReadings() {
  return state.devices.map((device) => {
    const history = state.histories[device.device_code] || [];
    const latest = history[history.length - 1] || {};

    return {
      device_code: device.device_code,
      device_name: device.device_name,
      device_type: device.device_type,
      room_name: device.room_name,
      temperature: latest.temperature ?? null,
      humidity: latest.humidity ?? null,
      light_level: latest.light_level ?? null,
      ir_detected: latest.ir_detected ?? null,
      anomaly_flag: latest.anomaly_flag ?? null,
      status_label: latest.status_label ?? null,
      latitude: latest.latitude ?? null,
      longitude: latest.longitude ?? null,
      recorded_at: latest.recorded_at || null
    };
  });
}

function getReadingHistory(deviceCode, limit) {
  const history = state.histories[deviceCode] || [];

  return history
    .slice(-limit)
    .reverse()
    .map((item) => ({
      device_code: deviceCode,
      device_name: getDeviceByCode(deviceCode)?.device_name || deviceCode,
      temperature: item.temperature ?? null,
      humidity: item.humidity ?? null,
      light_level: item.light_level ?? null,
      ir_detected: item.ir_detected ?? null,
      anomaly_flag: item.anomaly_flag ?? null,
      status_label: item.status_label ?? null,
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      recorded_at: item.recorded_at
    }));
}

function getDevices() {
  return state.devices.map((device) => ({
    ...device
  }));
}

function getAlerts() {
  return state.alerts.filter((alert) => !alert.is_resolved);
}

function resolveAlert(alertId) {
  const alert = state.alerts.find((item) => item.id === alertId);

  if (!alert) {
    return null;
  }

  alert.is_resolved = true;
  alert.resolved_at = new Date().toISOString();
  addActivity(`Resolved alert: ${alert.message}`, "routine");

  return { ...alert };
}

function createCommand(payload) {
  const deviceCode = normalizeText(payload.device_code);
  const commandType = normalizeUpper(payload.command_type);
  const commandValue = normalizeText(payload.command_value);
  const issuedBy = normalizeText(payload.issued_by) || "dashboard";

  const device = getDeviceByCode(deviceCode);

  if (!device) {
    return { error: "Device not found", status: 404 };
  }

  const command = {
    id: state.nextCommandId++,
    device_id: device.id,
    device_code: device.device_code,
    issued_by: issuedBy,
    command_type: commandType,
    command_value: commandValue,
    status: "SUCCESS",
    created_at: new Date().toISOString(),
    executed_at: new Date().toISOString(),
    error_message: null
  };

  state.commands.unshift(command);

  if (device.device_type === "actuator" && device.status === "online") {
    if (device.device_code === "DOOR_LOCK") {
      const isUnlocked = commandValue === "UNLOCK";
      device.power_status = isUnlocked ? "UNLOCKED" : "LOCKED";
      device.value_text = isUnlocked ? "Unlocked" : "Locked";
      device.value_number = isUnlocked ? 1 : 0;
      addActivity(
        isUnlocked ? "Door unlocked from dashboard" : "Door locked from dashboard",
        "success"
      );
    } else {
      const isOn = commandValue === "ON";
      device.power_status = isOn ? "ON" : "OFF";
      device.value_text = isOn ? `${device.device_name} On` : `${device.device_name} Off`;
      device.value_number = isOn ? 1 : 0;
      addActivity(
        `${device.device_name} turned ${isOn ? "on" : "off"} from dashboard`,
        "routine"
      );
    }

    device.updated_at = new Date().toISOString();
  }

  return { data: { ...command } };
}

function getPendingCommand(deviceCode) {
  return state.commands.find(
    (command) => command.device_code === deviceCode && command.status === "PENDING"
  ) || null;
}

function receiveReading(payload) {
  const deviceCode = normalizeText(payload.device_code);
  const device = getDeviceByCode(deviceCode);

  if (!device) {
    return { error: "Device not found", status: 404 };
  }

  const temperature = parseNumber(payload.temperature);
  const humidity = parseNumber(payload.humidity);
  const lightLevel = parseNumber(payload.light_level ?? payload.light);
  const irDetected = parseBoolean(payload.ir_detected ?? payload.motion);
  const anomalyFlag = parseBoolean(
    payload.anomaly_flag ?? payload.anomaly ?? payload.custom_value ?? payload.customValue
  );
  const latitude = parseNumber(payload.latitude ?? payload.lat);
  const longitude = parseNumber(payload.longitude ?? payload.long ?? payload.lng);
  const statusLabel = normalizeUpper(payload.status_label);
  const reading = {
    recorded_at: new Date().toISOString()
  };

  if (temperature !== null) {
    reading.temperature = temperature;
    state.histories.TEMP_SENSOR = [...(state.histories.TEMP_SENSOR || []), reading].slice(-12);
    getDeviceByCode("TEMP_SENSOR").value_number = temperature;
  }

  if (humidity !== null) {
    reading.humidity = humidity;
    state.histories.HUM_SENSOR = [...(state.histories.HUM_SENSOR || []), reading].slice(-12);
    getDeviceByCode("HUM_SENSOR").value_number = humidity;
  }

  if (lightLevel !== null) {
    reading.light_level = lightLevel;
    state.histories.LIGHT_SENSOR = [...(state.histories.LIGHT_SENSOR || []), reading].slice(-12);
    getDeviceByCode("LIGHT_SENSOR").value_number = lightLevel;
  }

  if (irDetected !== null) {
    reading.ir_detected = irDetected;
    state.histories.CAMERA_FRONT = [...(state.histories.CAMERA_FRONT || []), reading].slice(-12);
    getDeviceByCode("CAMERA_FRONT").value_number = irDetected ? 1 : 0;
  }

  if (anomalyFlag !== null) {
    reading.anomaly_flag = anomalyFlag;
  }

  if (statusLabel) {
    reading.status_label = statusLabel;
  }

  if (latitude !== null) {
    reading.latitude = latitude;
  }

  if (longitude !== null) {
    reading.longitude = longitude;
  }

  addAlertsForDevice(device, {
    temperature,
    humidity,
    lightLevel,
    irDetected,
    anomalyFlag
  });

  addActivity(`Received new reading from ${device.device_name}`, "info");

  return {
    data: {
      id: Date.now(),
      recorded_at: new Date().toISOString()
    }
  };
}

function updateDeviceStatus(payload) {
  const deviceCode = normalizeText(payload.device_code);
  const device = getDeviceByCode(deviceCode);

  if (!device) {
    return { error: "Device not found", status: 404 };
  }

  const powerStatus = normalizeUpper(payload.power_status, device.power_status);
  const valueText = normalizeText(payload.value_text);
  const valueNumber = parseNumber(payload.value_number);

  device.power_status = powerStatus;
  device.value_text = valueText ?? device.value_text;
  device.value_number = valueNumber ?? device.value_number;
  device.updated_at = new Date().toISOString();

  addActivity(`Updated status for ${device.device_name}`, "routine");

  return { data: { ...device } };
}

function updateCommandResult(payload) {
  const commandId = Number(payload.command_id);
  const command = state.commands.find((item) => item.id === commandId);

  if (!command) {
    return { error: "Command not found", status: 404 };
  }

  command.status = normalizeUpper(payload.status, command.status);
  command.error_message = normalizeText(payload.error_message);
  command.executed_at = new Date().toISOString();

  return { data: { ...command } };
}

function formatTrend(current, previous, suffix) {
  if (current === null || previous === null) {
    return {
      trendValue: "No change",
      trendDirection: "up"
    };
  }

  const diff = current - previous;
  const sign = diff > 0 ? "+" : "";

  return {
    trendValue: `${sign}${diff.toFixed(1)}${suffix}`,
    trendDirection: diff >= 0 ? "up" : "down"
  };
}

function getDashboardOverview() {
  const temperatureHistory = state.histories.TEMP_SENSOR || [];
  const humidityHistory = state.histories.HUM_SENSOR || [];
  const lightHistory = state.histories.LIGHT_SENSOR || [];

  const latestTemperature = temperatureHistory[temperatureHistory.length - 1]?.temperature ?? null;
  const prevTemperature = temperatureHistory[temperatureHistory.length - 2]?.temperature ?? null;
  const latestHumidity = humidityHistory[humidityHistory.length - 1]?.humidity ?? null;
  const prevHumidity = humidityHistory[humidityHistory.length - 2]?.humidity ?? null;
  const latestLight = lightHistory[lightHistory.length - 1]?.light_level ?? null;
  const prevLight = lightHistory[lightHistory.length - 2]?.light_level ?? null;

  const sensors = state.devices.filter((device) => device.device_type === "sensor");
  const actuators = state.devices.filter((device) => device.device_type === "actuator");

  return {
    environment: {
      temperature: {
        value: latestTemperature,
        unit: "deg C",
        dataKey: "value",
        history: temperatureHistory.map((item) => ({
          time: toDisplayTime(item.recorded_at),
          value: item.temperature
        })),
        statusText: latestTemperature !== null && latestTemperature >= 27 ? "Warm" : "Normal",
        ...formatTrend(latestTemperature, prevTemperature, " deg")
      },
      humidity: {
        value: latestHumidity,
        unit: "%",
        dataKey: "value",
        history: humidityHistory.map((item) => ({
          time: toDisplayTime(item.recorded_at),
          value: item.humidity
        })),
        statusText: latestHumidity !== null && latestHumidity >= 70 ? "Humid" : "Normal",
        ...formatTrend(latestHumidity, prevHumidity, "%")
      },
      light: {
        value: latestLight,
        unit: "Lux",
        dataKey: "value",
        history: lightHistory.map((item) => ({
          time: toDisplayTime(item.recorded_at),
          value: item.light_level
        })),
        statusText: latestLight !== null && latestLight >= 500 ? "Bright" : "Dim",
        ...formatTrend(latestLight, prevLight, "")
      }
    },
    logs: state.activity.slice(0, 8).map((item) => ({
      ...item,
      timeLabel: toDisplayTime(item.time)
    })),
    sensors: sensors.map((device) => ({
      device_code: device.device_code,
      name: device.device_name,
      status: device.status,
      type: "sensor",
      signal: device.signal
    })),
    actuators: actuators.map((device) => ({
      device_code: device.device_code,
      name: device.device_name,
      status: device.status,
      type: "actuator",
      signal: device.signal,
      state:
        device.device_code === "DOOR_LOCK"
          ? device.power_status === "UNLOCKED"
          : device.power_status === "ON"
    })),
    summary: {
      sensorsOnline: sensors.filter((device) => device.status === "online").length,
      sensorsIssue: sensors.filter((device) => device.status !== "online").length,
      actuatorsOnline: actuators.filter((device) => device.status === "online").length,
      actuatorsIssue: actuators.filter((device) => device.status !== "online").length
    },
    alerts: getAlerts()
  };
}

module.exports = {
  getLatestReadings,
  getReadingHistory,
  getDevices,
  getAlerts,
  resolveAlert,
  createCommand,
  getPendingCommand,
  receiveReading,
  updateDeviceStatus,
  updateCommandResult,
  getDashboardOverview,
  clone
};
