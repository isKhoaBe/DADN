CREATE TABLE IF NOT EXISTS devices (
    id BIGSERIAL PRIMARY KEY,
    device_code VARCHAR(50) UNIQUE NOT NULL,
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(30) NOT NULL,
    room_name VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    temperature NUMERIC(5,2),
    humidity NUMERIC(5,2),
    light_level NUMERIC(10,2),
    ir_detected BOOLEAN,
    anomaly_flag BOOLEAN,
    status_label VARCHAR(30),
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    raw_payload JSONB,
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_states (
    device_id BIGINT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    power_status VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
    value_text VARCHAR(100),
    value_number NUMERIC(10,2),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_commands (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    issued_by VARCHAR(100),
    command_type VARCHAR(30) NOT NULL,
    command_value VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT REFERENCES devices(id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'warning',
    message TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_recorded_at
    ON sensor_readings (device_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_unresolved_created_at
    ON alerts (is_resolved, created_at DESC);

CREATE TABLE IF NOT EXISTS ml_training_samples (
    id BIGSERIAL PRIMARY KEY,
    source_file VARCHAR(255) NOT NULL,
    source_row_number INTEGER NOT NULL,
    temperature NUMERIC(5,2) NOT NULL,
    humidity NUMERIC(5,2) NOT NULL,
    anomaly_flag BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (source_file, source_row_number)
);

INSERT INTO devices (device_code, device_name, device_type, room_name)
VALUES
('YB_01', 'YoloUNO Sensor Hub', 'gateway_sensor', 'Living Room'),
('DOOR_LOCK', 'Smart Door Lock', 'lock', 'Front Door'),
('LIVING_LIGHTS', 'Living Room Lights', 'light', 'Living Room'),
('HVAC_FAN', 'HVAC Mini Fan', 'fan', 'Living Room')
ON CONFLICT (device_code) DO NOTHING;
