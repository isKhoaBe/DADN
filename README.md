# YoloUNO ESP32-S3 Smart Home Automation & AI Security System

This project is an IoT system built on the [**YOLO UNO ESP32 / ESP32-S3-WROOM**](https://ohstem.vn/product/yolo-uno/) board from [**OhStem**](https://ohstem.vn/).

It was developed from an older template (which previously featured TinyML, CoreIOT, and a Telegram bot). This updated version removes those features and introduces a complete **Smart Home Automation architecture** with **AI Face Recognition for security**, environmental automation (Fan, Lighting), and a **Full-Stack Web Dashboard** powered by a Node.js backend, React frontend, and a **Supabase PostgreSQL database**.

---

## Table of Contents

- [Project Structure](#project-structure)
- [1. Hardware Setup](#1-hardware-setup)
- [2. Software Architecture & RTOS Design](#2-software-architecture--rtos-design)
- [3. Core Legacy Features (Maintained)](#3-core-legacy-features-maintained)
- [4. New Smart Home & Security Features](#4-new-smart-home--security-features)
- [5. Full-Stack Web Dashboard & Supabase Integration](#5-full-stack-web-dashboard--supabase-integration)
- [6. Deprecated Features (Removed)](#6-deprecated-features-removed)
- [7. Build & Deployment](#7-build--deployment)

---

## Project Structure

```text
DADN/
├── platformio.ini
├── boards/
│   └── yolo_uno.json
├── include/                      # Firmware headers & config
│   ├── .configuration.h          # Central config
│   ├── dht20_reader.h
│   ├── fan_control.h
│   ├── light_control.h
│   ├── light_sensor.h
│   ├── pir_sensor.h
│   ├── supabase.h
│   ├── task_ai_relay.h
│   ├── task_supabase.h
│   ├── temp_humi_monitor.h
│   └── ...
├── src/                          # ESP32 firmware sources
│   ├── main.cpp                  # RTOS Task creation & loop
│   ├── fan_control.cpp           # Fan automation (Temp/Humi)
│   ├── light_control.cpp         # Lighting relay automation
│   ├── light_sensor.cpp          # Photoresistor logic
│   ├── pir_sensor.cpp            # Motion detection logic
│   ├── supabase.cpp              # HTTP REST client to Supabase
│   ├── task_ai_relay.cpp         # Serial receiver for Face Recog
│   ├── task_supabase.cpp         # Cloud data logging task
│   └── ...
├── data/                         # Full-Stack Web Application
│   ├── backend/                  # Node.js backend (Express)
│   └── frontend/                 # Vite/React frontend dashboard
├── python/                       # AI Application
│   └── Face Recognize/           # Python OpenCV / Face_recognition scripts
│       ├── face_database.py
│       └── face_recognition_main.py
└── lib/                          # Vendored libraries (ArduinoJson, DHT20, ThingsBoard, etc.)
```

---

## 1. Hardware Setup

- **Board:** YOLO UNO ESP32 / ESP32-S3.
- **Sensors:**
  - Temperature & Humidity Sensor (DHT20) via I²C.
  - Motion Sensor (PIR) for presence detection.
  - Light Sensor (Photoresistor) for darkness detection.
- **Actuators & Relays:**
  - Fan Control Relay.
  - Door Lock Relay.
  - Inside Light Relay.
  - Front Door (Outside) Light Relay.
- **Indicators:**
  - Temperature LED indicator (5 states).
  - Humidity NeoPixel strip indicator (7 states).
  - LCD module (1602 I²C) for status display.
- **Connectivity:** WiFi for Supabase cloud communication. PC connected via Serial for Face Recognition.

---

## 2. Software Architecture & RTOS Design

The firmware is a **multi-task FreeRTOS application** built with PlatformIO. The main tasks created in `setup()`:

- **Sensor Tasks:**
  - `Task DHT20 Reader`: reads temperature/humidity and updates shared data.
  - `PIR Sensor Task`: monitors motion detection.
  - `Light Sensor Task`: monitors brightness levels.
- **Indicator & Display Tasks:**
  - `Task LED Blinky`: drives the LED for temperature status.
  - `Task NEO Blinky`: drives NeoPixels for humidity status.
  - `Task Temp & Humi Monitor`: updates the LCD.
- **Automation Tasks:**
  - `Fan Control Task`: controls the fan based on thresholds.
  - `AI Relay Task`: listens on Serial for Python AI face recognition commands to control the door lock.
- **Cloud Task:**
  - `Task Supabase`: handles uploading telemetry data and system event alerts to the Supabase backend.
- **System Task:** `Task WiFi` maintains the internet connection.

---

## 3. Core Legacy Features (Maintained)

- **Temperature-controlled LED:** A 5-state blinking LED indicating environment temperature (Cold, Ideal, Normal, Hot, Warning).
- **Humidity-controlled NeoPixel:** A 7-state rainbow mapped to different humidity levels, displaying white on error.
- **LCD Display System:** Displays temperature, humidity, and HCMC-specific environmental text context.

---

## 4. New Smart Home & Security Features

This version focuses heavily on home automation triggers and edge AI security:

### 4.1. Intelligent Fan Automation
- Monitors shared DHT20 data.
- **Rule:** If the temperature rises above **32.0°C** OR humidity rises above **80.0%**, the ESP32 automatically activates the fan relay.
- Logs events (`FAN_ON` / `FAN_OFF`) to the Supabase security log.

### 4.2. Motion-triggered Outdoor Lighting
- Utilizes the PIR sensor.
- **Rule:** When human motion is detected at the front door, the outside light is turned ON. When motion stops, it turns OFF.
- Generates `MOTION` alerts pushed to the dashboard.

### 4.3. Darkness-triggered Indoor Lighting
- Utilizes the analog Light Sensor.
- **Rule:** When the ambient light falls below the `DARK_THRESHOLD`, the system turns the inside light ON.

### 4.4. AI Face Recognition Door Lock
- **Edge AI (PC-based):** A Python script (`python/Face Recognize/face_recognition_main.py`) captures webcam video and runs facial recognition against known databases.
- **Communication:** Python sends a clear `"yes"` or `"no"` instruction to the ESP32 over the Serial port (CH340).
- **Action:**
  - `"yes"` -> Recognized face -> Door Lock Relay `HIGH` (Unlocked).
  - `"no"` -> Unrecognized/No face -> Door Lock Relay `LOW` (Locked).
- Generates critical Security Logs (`DOOR_UNLOCK` / `DOOR_LOCK`) pushed to the dashboard.

---

## 5. Full-Stack Web Dashboard & Supabase Integration

### 5.1. Supabase Cloud Telemetry
- Replaces CoreIOT. The ESP32 connects directly to a PostgreSQL Supabase database using REST APIs.
- Pushes continuous sensor telemetry (Temp, Humidity).
- Pushes specific security logs from tasks (e.g., Face Recognition unlocks, Motion detections, Fan state changes).

### 5.2. Web Dashboard
- **Backend:** A Node.js backend handles direct database queries/connections where necessary.
- **Frontend:** A React (Vite) application designed as a simple main dashboard.
- **Features:** 
  - Real-time display of sensor metrics.
  - **Security Log feed:** Displays every output log (AI detections, temp/humidity alerts, light adjustments) matched with real-time accuracy.
  - *Note:* The Monitor/Gesture/Control tabs from older iterations were completely removed to keep the interface simple, streamlined, and focused purely on automated system observations.

---

## 6. Deprecated Features (Removed)

To make room for the new Smart Home Automation system, the following features from the original template have been permanently removed:

- **TinyML Anomaly Detection (Task 5):** Replaced by the Python-based AI Face Recognition system.
- **CoreIOT Task (Task 6):** Completely deprecated in favor of a Supabase DB + custom backend.
- **Telegram Bot / Alerts:** Replaced by the central Full-Stack Web Dashboard.
- **AP Mode Web Server:** Local web server & captive portal removed in favor of the cloud Dashboard.
- **Python Simulators:** The MQTT/CoreIOT/Telegram mocking scripts were removed.

---

## 7. Build & Deployment

1. **Hardware:** Connect the DHT20, PIR Sensor, Light Sensor, and 4 relays (Fan, Door, Inside Light, Outside Light) to the YOLO UNO according to the pins defined in `.configuration.h` and the C++ files.
2. **Firmware:**
   - Clone the repo.
   - Set WiFi & Supabase configuration/keys.
   - Build and Upload using **PlatformIO** (`pio run -t upload`).
3. **Web Application:**
   - Navigate to `data/backend`, copy `.env.example` to `.env`, and fill in Supabase credentials. Run `npm install` and `npm run dev`.
   - Navigate to `data/frontend`, copy `.env.example` to `.env`, install dependencies, and run `npm run dev` to access the local dashboard.
4. **AI Face Recognition:**
   - Create a virtual environment and `pip install -r requirements.txt`.
   - Ensure your board's serial port matches the Python script.
   - Run `python/Face Recognize/face_recognition_main.py` with your webcam active.
