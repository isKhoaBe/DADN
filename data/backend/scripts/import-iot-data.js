require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to import IoT data.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false }
});

const csvFiles = [
  {
    sourceFile: "HCMC_temp_humid_raw.csv",
    absolutePath: path.resolve(__dirname, "../../../IOT/python/Tiny ML/data/HCMC_temp_humid_raw.csv"),
    label: "historical"
  },
  {
    sourceFile: "dht_anomaly_dataset_1000.csv",
    absolutePath: path.resolve(__dirname, "../../../IOT/python/Tiny ML/data/dht_anomaly_dataset_1000.csv"),
    label: "anomaly_dataset"
  }
];

function parseCsvLine(line) {
  const [temperature, humidity, anomaly] = line.split(",").map((value) => value.trim());

  return {
    temperature: Number(temperature),
    humidity: Number(humidity),
    anomalyFlag: anomaly === "1"
  };
}

function buildStatusLabel(temperature, humidity, anomalyFlag) {
  if (anomalyFlag) {
    return "WARNING";
  }

  if (temperature <= 20) {
    return "COLD";
  }

  if (temperature <= 25 && humidity > 60 && humidity <= 75) {
    return "IDEAL";
  }

  if (temperature <= 30) {
    return "NORMAL";
  }

  if (temperature <= 35) {
    return "HOT";
  }

  return "WARNING";
}

async function ensurePrimaryDevice(client) {
  await client.query(
    `INSERT INTO devices (device_code, device_name, device_type, room_name)
     VALUES ('YB_01', 'YoloUNO Sensor Hub', 'gateway_sensor', 'Living Room')
     ON CONFLICT (device_code) DO NOTHING`
  );

  const result = await client.query(
    `SELECT id FROM devices WHERE device_code = 'YB_01' LIMIT 1`
  );

  return result.rows[0].id;
}

async function importFile(client, deviceId, fileConfig) {
  const raw = fs.readFileSync(fileConfig.absolutePath, "utf8");
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine)
    .filter((row) => Number.isFinite(row.temperature) && Number.isFinite(row.humidity));

  await client.query(
    `DELETE FROM sensor_readings
     WHERE device_id = $1
       AND raw_payload ->> 'source_file' = $2`,
    [deviceId, fileConfig.sourceFile]
  );

  await client.query(
    `DELETE FROM ml_training_samples
     WHERE source_file = $1`,
    [fileConfig.sourceFile]
  );

  const chunkSize = 250;

  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const sensorPlaceholders = [];
    const sensorValues = [];
    const samplePlaceholders = [];
    const sampleValues = [];

    chunk.forEach((row, chunkIndex) => {
      const index = start + chunkIndex;
      const recordedAt = new Date(Date.now() - (rows.length - 1 - index) * 5 * 60 * 1000);
      const statusLabel = buildStatusLabel(row.temperature, row.humidity, row.anomalyFlag);
      const sensorOffset = chunkIndex * 7;
      const sampleOffset = chunkIndex * 5;

      sensorPlaceholders.push(
        `($${sensorOffset + 1}, $${sensorOffset + 2}, $${sensorOffset + 3}, $${sensorOffset + 4}, $${sensorOffset + 5}, $${sensorOffset + 6}::jsonb, $${sensorOffset + 7})`
      );
      sensorValues.push(
        deviceId,
        row.temperature,
        row.humidity,
        row.anomalyFlag,
        statusLabel,
        JSON.stringify({
          source_file: fileConfig.sourceFile,
          source_row_number: index + 1,
          source_label: fileConfig.label
        }),
        recordedAt.toISOString()
      );

      samplePlaceholders.push(
        `($${sampleOffset + 1}, $${sampleOffset + 2}, $${sampleOffset + 3}, $${sampleOffset + 4}, $${sampleOffset + 5})`
      );
      sampleValues.push(
        fileConfig.sourceFile,
        index + 1,
        row.temperature,
        row.humidity,
        row.anomalyFlag
      );
    });

    await client.query(
      `INSERT INTO sensor_readings
       (device_id, temperature, humidity, anomaly_flag, status_label, raw_payload, recorded_at)
       VALUES ${sensorPlaceholders.join(", ")}`,
      sensorValues
    );

    await client.query(
      `INSERT INTO ml_training_samples
       (source_file, source_row_number, temperature, humidity, anomaly_flag)
       VALUES ${samplePlaceholders.join(", ")}`,
      sampleValues
    );

    console.log(
      `Imported ${Math.min(start + chunk.length, rows.length)}/${rows.length} rows from ${fileConfig.sourceFile}`
    );
  }

  return rows.length;
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const deviceId = await ensurePrimaryDevice(client);
    let importedCount = 0;

    for (const fileConfig of csvFiles) {
      importedCount += await importFile(client, deviceId, fileConfig);
    }

    await client.query("COMMIT");
    console.log(`Imported ${importedCount} IoT samples into PostgreSQL.`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("IoT import failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
