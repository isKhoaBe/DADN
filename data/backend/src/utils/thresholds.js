function getThresholdNumber(value, fallback) {
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

function buildAlerts({ temperature, humidity, lightLevel, irDetected, anomalyFlag }) {
  const alerts = [];

  const tempThreshold = getThresholdNumber(process.env.TEMP_THRESHOLD, 35);
  const humidityThreshold = getThresholdNumber(process.env.HUMIDITY_THRESHOLD, 80);
  const lightThresholdLow = getThresholdNumber(process.env.LIGHT_THRESHOLD_LOW, 100);

  if (temperature !== null && temperature > tempThreshold) {
    alerts.push({
      alert_type: "HIGH_TEMPERATURE",
      severity: "warning",
      message: `Temperature too high: ${temperature}°C`
    });
  }

  if (humidity !== null && humidity > humidityThreshold) {
    alerts.push({
      alert_type: "HIGH_HUMIDITY",
      severity: "warning",
      message: `Humidity too high: ${humidity}%`
    });
  }

  if (lightLevel !== null && lightLevel < lightThresholdLow) {
    alerts.push({
      alert_type: "LOW_LIGHT",
      severity: "warning",
      message: `Light level too low: ${lightLevel}`
    });
  }

  if (irDetected === true) {
    alerts.push({
      alert_type: "MOTION_DETECTED",
      severity: "warning",
      message: "Motion detected near monitored area"
    });
  }

  if (anomalyFlag === true) {
    alerts.push({
      alert_type: "ANOMALY_DETECTED",
      severity: "warning",
      message: "Anomaly flag detected from IoT payload"
    });
  }

  return alerts;
}

module.exports = { buildAlerts };
