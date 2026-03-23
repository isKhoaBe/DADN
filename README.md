# YoloUNO ESP32-S3 Smart Environment Monitoring (TinyML · CoreIOT · Telegram)

This project is an IoT course assignment built on the [**YOLO UNO ESP32 / ESP32-S3-WROOM**](https://ohstem.vn/product/yolo-uno/) board from [**OhStem**](https://ohstem.vn/), using OhStem’s AIOT Kit temperature/humidity sensor and LCD module.

It is based on Dr. [Le Trong Nhan](https://github.com/nhanksd85)’s original RTOS template:

> **Base project:** [`YoloUNO_PlatformIO – RTOS_Project`](https://github.com/nhanksd85/YoloUNO_PlatformIO/tree/RTOS_Project) (ESP32-S3, PlatformIO, FreeRTOS)

On top of the base template, this project adds and restructures functionality to:

- Implement all required **Tasks 1–6** (LED, NeoPixel, LCD, AP web server, TinyML, CoreIOT).
- Introduce **30%+ new functionality**, especially:
  - A **central configuration system** (`.configuration.h`) for pins, timing, debug and feature toggles.
  - A **Telegram bot** for remote monitoring and anomaly alerts.
  - A set of **Python scripts**:
    - To log data and **train the TinyML model**.
    - To **simulate CoreIOT server interactions**.
    - To **simulate Telegram API interactions** for testing without the ESP32.

- Application choice for TinyML: ***anomaly detection in Ho Chi Minh City climate***

  - For the **application design**, we implement the mandatory **TinyML task** as an **anomaly detector for temperature and humidity**, trained on data that reflects the **typical hot and humid weather of Ho Chi Minh City**.

  - In HCMC, temperatures around **25–32°C** and humidity around **60–80%** are treated as **normal**. Values far outside these ranges are considered **potential anomalies** and are used both to **label TinyML training data** and to define the states **COLD / IDEAL / NORMAL / HOT / WARNING** and the humidity levels “very dry / dry / comfortable / humid / very humid”. All **TinyML outputs, LED/NeoPixel colors, LCD messages, and Telegram alerts** are interpreted in this HCMC-specific context.

This is the circuit schematic of the YOLO UNO ESP32-S3 board:

![YOLO UNO ESP32-S3 board](https://ohstem.vn/wp-content/uploads/2023/12/pinout-mach-yolo-uno-1024x924.png)

---

## Table of Contents

- [Project Structure](#project-structure)
- [1. Hardware Setup (Short Overview)](#1-hardware-setup-short-overview)
- [2. Software Architecture & RTOS Design (Short Overview)](#2-software-architecture--rtos-design-short-overview)
- [3. Assignment Tasks 1–6 (Short Summary)](#3-assignment-tasks-16-short-summary)
- [4. Main Extensions & Contributions](#4-main-extensions--contributions)
- [5. Configuration Manual (Key Parameters from configurationh)](#5-configuration-manual-key-parameters-from-configurationh)
- [6. Build & Deployment (Short)](#6-build--deployment-short)
- [7. Usage Overview](#7-usage-overview)
- [8. TinyML Workflow (High-Level)](#8-tinyml-workflow-high-level)
- [9. CoreIOT Integration & Testing](#9-coreiot-integration--testing)
- [10. Credits](#10-credits)

---

## Project Structure

```
IOT-251-Assignment/
├── platformio.ini
├── eslint.config.js
├── package.json
├── package-lock.json
├── requirements.txt
├── boards/
│   └── yolo_uno.json
├── include/                      # Firmware headers & config
│   ├── .configuration.h          # Central config
│   ├── global.h                  # Globals & semaphores
│   ├── project_includes.h
│   ├── bot_alert.h
│   ├── coreiot.h
│   ├── dht20_reader.h
│   ├── led_blinky.h
│   ├── neo_blinky.h
│   ├── temp_humi_monitor.h
│   ├── tinyml.h
│   ├── mainserver.h
│   ├── sensor_log.h
│   ├── task_check_info.h
│   ├── task_core_iot.h
│   ├── task_handler.h
│   ├── task_rs485.h
│   ├── task_toogle_boot.h
│   ├── task_webserver.h
│   └── task_wifi.h
├── src/                          # ESP32 firmware sources
│   ├── main.cpp                  # Task creation & loop
│   ├── bot_alert.cpp             # Telegram bot
│   ├── coreiot.cpp               # CoreIOT MQTT client
│   ├── dht20_reader.cpp          # DHT20 sampling
│   ├── led_blinky.cpp            # Temp LED logic
│   ├── neo_blinky.cpp            # Humidity NeoPixel logic
│   ├── temp_humi_monitor.cpp     # Sensor aggregation
│   ├── tinyml.cpp                # TinyML inference
│   ├── mainserver.cpp
│   ├── sensor_log.cpp
│   ├── task_check_info.cpp
│   ├── task_core_iot.cpp
│   ├── task_handler.cpp
│   ├── task_rs485.cpp
│   ├── task_toogle_boot.cpp
│   ├── task_webserver.cpp        # Web server + WebSocket
│   └── task_wifi.cpp             # AP/STA handling
├── data/                         # LittleFS web assets
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── lib/                          # Vendored libraries
│   ├── ArduinoJson/
│   ├── ArduinoHttpClient/
│   ├── DHT20/
│   ├── ElegantOTA-master/
│   ├── LCD/
│   ├── PubSubClient/
│   └── ThingsBoard/
├── temp/                         # TinyML artifacts & backups
│   ├── dht_anomaly_model.h
│   ├── old_dht_anomaly_model.h
│   ├── README.md
│   ├── data backup/
│   └── web_test/
├── python/                       # Tooling & simulators
│   ├── CoreIOT Simulator/
│   ├── MQTT Broker/
│   ├── Telegram Bot/
│   └── Tiny ML/                  # TinyML data + training scripts
│       ├── data/                 # Raw logged CSVs
│       ├── data_cleaner.py       # Basic cleaning/selection
│       ├── data_preprocessor.py  # Feature prep/labeling
│       ├── TFL_For_MCU.py        # Convert/train for MCU export
│       ├── model_tester.py       # Quick eval on held-out data
│       ├── model_verify.py       # Sanity checks/metrics
│       ├── all_plot.py           # Generate plots
│       ├── trained models/       # Exported binaries/headers
│       └── plots/                # Generated plots
└── test/                         # Test scaffolding
  └── README
```

---

## 1. Hardware Setup (Short Overview)

- **Board:** YOLO UNO ESP32 / ESP32-S3.
- **Sensors:** Temperature & Humidity sensor (DHT20).
- **Display:** LCD module (LCD 1602 I²C).
- **Indicators:**
  - Single LED (temperature – 5 states).
  - NeoPixel RGB strip (humidity – 7 rainbow states + white for error).
- **Connectivity:** WiFi AP + STA (for web UI, CoreIOT, Telegram).

All important pins (LED, NeoPixel, I²C, etc.) are configurable in **`.configuration.h`** instead of being hard-coded across source files.

---

## 2. Software Architecture & RTOS Design (Short Overview)

The firmware is a **multi-task FreeRTOS application** built with PlatformIO. Tasks actually created in `setup()`:

- **Sensor task:** reads temperature/humidity and updates shared data.
- **LED task:** drives the normal LED with a **5-state temperature state machine** (Task 1).
- **NeoPixel task:** drives a **7-state humidity indicator in rainbow colors + white on error** (Task 2).
- **LCD task:** displays sensor values and a **5-level environment status** (Task 3).
- **AP Webserver task:** serves a small control UI in AP mode (Task 4).
- **TinyML task:** runs on-device inference (Task 5).
- **CoreIOT task:** pushes data to CoreIOT cloud in STA mode (Task 6).
- **Telegram task:** handles Telegram bot commands and warnings (extra feature).
- **Shared configuration & utilities:** centralized in `.configuration.h` and helper modules.

Tasks communicate using **queues and semaphores**. Sensor values are kept in shared data structures protected by RTOS primitives to avoid race conditions and global-variable issues.

---

## 3. Assignment Tasks 1–6 (Short Summary)

### Task 1 – Temperature-controlled LED + Semaphore (5 States)

A single normal LED (`LED_PIN`) implements a **5-state temperature indicator**:

| **State**        | **Temperature range (°C)** | **Meaning in HCMC context**                           |
|------------------|----------------------------|-------------------------------------------------------|
| `COLD`           | `≤ 20`                     | Unusually cold for HCMC                               |
| `IDEAL`          | `20 –> 25`                 | Cool and very comfortable                             |
| `NORMAL`         | `25 –> 30`                 | Slightly warm, quite normal for HCMC                  |
| `HOT`            | `30 –> 35`                 | Hot, but still within common HCMC range               |
| `WARNING!`       | `> 35`                     | Very hot – considered anomalous / pay attention       |

Each state maps to a **different blink pattern** (slow, breathing, normal, fast, alert).

- The **sensor task** updates `sensorData.temperature` and gives a **semaphore**.
- The **LED task** waits on that semaphore, reads the latest temperature, determines `TempState`, and applies the corresponding blink pattern.

---

### Task 2 – Humidity-controlled NeoPixel + Semaphore  
**(7 Rainbow States + White for Sensor Error)**

The NeoPixel strip (`NEO_LED_PIN`, `NEO_LED_NUMBER`) visualizes **humidity** using a rainbow color map plus a special error color:

```cpp
uint32_t color_map[] = {
    strip.Color(255,   0,   0),   // Red
    strip.Color(255, 127,   0),   // Orange
    strip.Color(255, 255,   0),   // Yellow
    strip.Color(0,   255,   0),   // Green
    strip.Color(0,     0, 255),   // Blue
    strip.Color(75,    0, 130),   // Indigo
    strip.Color(148,   0, 211),   // Violet
    strip.Color(255, 255, 255)    // White (error)
};
```

Humidity is divided into **7 logical bands** which are mapped to the 7 colors of the rainbow:

| **Index** | **Approx. RH range (%)**    | **Semantic level (HCMC)**           | **Color shown**  |
|-----------|-----------------------------|-------------------------------------|------------------|
| 0         | `< 30`                      | Very dry (abnormal)                 | Red              |
| 1         | `30 –> 40`                  | Dry                                 | Orange           |
| 2         | `40 –> 50`                  | Slightly dry                        | Yellow           |
| 3         | `50 -> 60`                  | Near lower comfort bound            | Green            |
| 4         | `60 -> 70`                  | Comfortable humidity (HCMC)         | Blue             |
| 5         | `70 -> 85`                  | Very humid but still acceptable     | Indigo           |
| 6         | `85 –> 100`                 | Near saturation, muggy              | Violet           |
| 7         | `> 100` or sensor error     | Invalid / sensor error              | **White**        |

If the humidity reading is **above 100%** or clearly invalid, the NeoPixel shows **white** to indicate a **sensor error / abnormal input**.

- The **sensor task** updates `sensorData.humidity` and signals via a semaphore.
- The **NeoPixel task** takes the semaphore, reads the current humidity, maps it to index 0–6, or uses the white error color if the value is out of bounds.

---

### Task 3 – LCD Display Without Global Variables (5 Environment States)

The LCD shows **temperature, humidity, and a combined environment status** derived from both:

- An internal function like `getEnvStatus(temperature, humidity)` categorizes the environment into 5 states:

| **State**         | **Temperature (°C) (typical)** | **Humidity (%) (typical)**     | **Meaning in HCMC context**                     |
|-------------------|--------------------------------|--------------------------------|-------------------------------------------------|
| `ENV_COLD`        | ≤ 20                           | 60 < RH ≤ 75                   | Cold + slightly humid (rare in HCMC)            |
| `ENV_IDEAL`       | 20 < T ≤ 25                    | 60 < RH ≤ 75                   | Cool and comfortably humid                      |
| `ENV_NORMAL`      | 25 < T ≤ 30                    | 60 < RH ≤ 80                   | Warm and humid – typical HCMC                   |
| `ENV_HOT`         | 30 < T ≤ 35                    | 60 < RH ≤ 80                   | Hot and humid but still acceptable              |
| `ENV_WARNING`     | Anything outside the above     | Any                            | Out of comfort range – treated as anomaly       |

- The LCD **does not** rely on raw global variables:
  - Sensor data is passed through **queues + semaphores**.
  - The LCD task only updates when new data arrives, ensuring RTOS-safe access.

---

### Task 4 – Web Server in AP Mode

- The ESP32 creates a **WiFi Access Point** with SSID/password from the firmware configuration.
- A simple **control webpage** served at `/` lets the user toggle **two devices** (e.g., normal LED + NeoPixel).
- This AP control UI can coexist with the **extended status web page** described later.

---

### Task 5 – TinyML Model Deployment

- Sensor data is collected and exported via Serial.
- A **Python training script** processes this data and trains a TinyML model that classifies the environment (e.g., NORMAL / WARNING / CRITICAL).
- The trained model is converted into a C array and linked into the firmware.  
  The TinyML task:
  - Reads the latest temperature/humidity,
  - Runs inference,
  - Publishes the result to other tasks (LCD, web, Telegram).

---

### Task 6 – CoreIOT Cloud Publishing

- In **STA mode**, WiFi credentials from the configuration headers are used to join the local network.
- The CoreIOT task periodically sends JSON-formatted sensor and state data to **CoreIOT**, using a **device token** stored in configuration.
- A **Python simulation script** can mimic the CoreIOT server or act as a client, to test payload format and behavior without the real cloud.

---

## 4. Main Extensions & Contributions

This section focuses on what was **added or significantly redesigned** compared to the base  
[`YoloUNO_PlatformIO – RTOS_Project`](https://github.com/nhanksd85/YoloUNO_PlatformIO/tree/RTOS_Project).

### 4.1 Central Configuration System (`.configuration.h`)

Instead of scattering constants throughout the code, this project uses a dedicated **configuration header**  
**`.configuration.h`** as a single source of truth.

Main groups of parameters:

- **Mode / Debug**
  - `IS_DEBUG_MODE`
  - `IS_SHOW_DHT20_STATUS`
  - `IS_SHOW_LED_STATUS`
  - `IS_SHOW_NEO_STATUS`
  - `IS_SHOW_LCD_STATUS`
  - `IS_SHOW_PAYLOAD`
  - `IS_SHOW_INFERENCE_RESULT`
  - `IS_SHOW_BOT_STATUS`
  - `IS_SHOW_SENSOR_LOG`
- **Task timing (ms)**
  - `LED_BLINKY_DELAY_MS`
  - `NEO_BLINKY_DELAY_MS`
  - `TEMP_HUMI_DELAY_MS`
  - `MAIN_SERVER_DELAY_MS`
  - `TINY_ML_DELAY_MS`
  - `POLL_FROM_SERVER_DELAY_MS`
  - `CORE_IOT_DELAY_MS`
  - `LED_READER_DELAY_MS`
  - `HUMID_READER_DELAY_MS`
  - `SENSOR_LOG_DELAY_MS`
  - `LONG_PRESS_MS`
  - `DEBOUNCE_MS`
- **Networking / Retry intervals**
  - `WIFI_CONNECT_TIMEOUT_MS`
  - `WIFI_RETRY_INTERVAL_MS`
  - `MQTT_RETRY_INTERVAL_MS`
- **GPIO pins**
  - `BOOT_PIN`
  - `LED_PIN`
  - `NEO_LED_PIN`
  - `NEO_LED_NUMBER`
- **I²C pins**
  - `I2C_SDA_PIN`
  - `I2C_SCL_PIN`

**Design choices:**

- **Single source of truth:** change pins or task periods in one place.
- **Easy grading & reuse:** instructors and other students can quickly see tunable parameters.
- **Flexible builds:** easy to compile a **minimal** vs. **full** version by toggling flags without editing task logic.

---

### 4.2 Telegram Bot for Remote Monitoring & Alerts

A key extension is the **Telegram bot integration**, which allows:

- Checking the environmental status using thresholds meaningful for **Ho Chi Minh City**.
- Receiving **push alerts** when conditions leave the “safe” range.

#### 4.2.1 How It Works

- A Telegram task runs in parallel on the ESP32.
- It uses `BOT_TOKEN` and `CHAT_ID` (configured in `bot_alert.*`) to connect to the Telegram Bot API.
- The bot:
  - Periodically polls for new updates (`BOT_POLL_PERIOD_MS`).
  - Accepts commands **only** from the configured `CHAT_ID` (ignores others).
  - Reads the latest `lastTemp`, `lastHumi`, TinyML inference result, and LED/NeoPixel states.
  - Sends messages:
    - When the bot task starts,
    - When the environment moves from **NORMAL → WARNING**,
    - When it returns from **WARNING → NORMAL**.

The **warning range** is based on HCMC climate and is hard-coded in the bot:

- The **NORMAL** range is:
  - `20.0 °C ≤ temperature ≤ 40.0 °C`
  - `60.0 % ≤ humidity ≤ 80.0 %`
- If the readings are **outside** this range, the bot considers the situation **WARNING = YES**.

#### 4.2.2 Supported Commands (per code)

The bot currently supports these commands (from `src/bot_alert.cpp`):

- `/start`  
  Sends a greeting and a simple help message:

  ```text
  Hi! I am ESP32 DHT20 monitor bot.
  Commands:
      /start  - Show this help message
      /status - Show current temperature, humidity, and inference result
      /led_on  - Turn ON indicator LED
      /led_off - Turn OFF indicator LED
      /neo_on  - Turn ON NeoPixel LED
      /neo_off - Turn OFF NeoPixel LED
  ```

- `/status`  
  Sends a detailed snapshot:

  ```text
  Current status:
      - Temperature = XX.X C
      - Humidity    = YY.Y %
      - WARNING: YES/NO

      - Inference result = Z.ZZZZ

      - LED is ON/OFF
      - NeoPixel LED is ON/OFF
  ```

- `/led_on` / `/led_off`  
  Updates `is_LED_on` and replies with:

  ```text
  ✅ LED Blinky has been turned ON.
  ```

  or

  ```text
  ✅ LED Blinky has been turned OFF.
  ```

- `/neo_on` / `/neo_off`  
  Updates `is_NeoLED_on` and replies with:

  ```text
  ✅ NeoPixel LED has been turned ON.
  ```

  or

  ```text
  ✅ NeoPixel LED has been turned OFF.
  ```

- **Any other command**  
  Replies with a generic help message listing all valid commands.

> Security: `BOT_TOKEN` and `CHAT_ID` are hard-coded in `src/bot_alert.cpp`. Replace them before flashing or committing.

#### 4.2.3 Automatic Alerts

Besides responding to commands, the bot also sends **automatic notifications**:

- On task startup:

  ```text
  ESP32 Temp & Humi bot started. Type /start to see available commands.
  ```

- When the environment goes **from NORMAL → WARNING**:

  - Sends a warning:

    ```text
    ⚠ WARNING! Temp/Humi out of range.
        - Temperature = XX.X C
        - Humidity    = YY.Y %
        - Inference result = Z.ZZZZ
        - LED is ON/OFF
        - NeoPixel LED is ON/OFF
    ```

- When the environment goes **from WARNING → NORMAL**:

  - Sends a recovery message:

    ```text
    ✅ Back to normal.
        - Temperature = XX.X C
        - Humidity    = YY.Y %
        - Inference result = Z.ZZZZ
        - LED is ON/OFF
        - NeoPixel LED is ON/OFF
    ```

This makes the bot act both as a **text dashboard** and as an **anomaly alert channel** aligned with HCMC conditions.

---

### 4.3 Python Tools for Data, Training & Simulation

To support development, testing and report writing, a set of **Python scripts** were created (kept outside the firmware):

#### 4.3.1 Data Logger & TinyML Training Script

- Connects to the ESP32 over Serial.
- Parses logs of the form `T=xx.x,H=yy.y,STATE=...`.
- Saves records into a **CSV file**.

Typical training workflow:

1. Load CSV into a DataFrame (e.g., with pandas).
2. Preprocess features (normalization, moving averages).
3. Assign labels (NORMAL / WARNING / CRITICAL) based on HCMC thresholds.
4. Train a small model (dense NN, decision tree, etc.).
5. Evaluate with confusion matrix and accuracy scores.
6. Export the final model as a C header (TinyML-friendly format).

#### 4.3.2 CoreIOT Server Simulation Script

- Implements a small HTTP server (e.g., Flask) that:
  - Listens on a configurable port.
  - Accepts POST JSON payloads in the same format as the ESP32 uses for CoreIOT.
  - Logs the payloads and responds with a fake “OK” JSON.

Use cases:

- Validate **payload structure** and sending frequency.
- Simulate **network problems** by altering responses or stopping the script.
- Collect example messages for documentation.

#### 4.3.3 Telegram API Simulation Script

- Mocks Telegram responses (`getUpdates`, `sendMessage`).
- Can feed scripted “incoming messages” (like `/status`) into a test harness.
- Logs what the firmware would send out, without hitting the real Telegram servers.

This is useful for debugging **command parsing** and **message formatting** logic.

---

### 4.4 Extended Status Web Page

Beyond the basic AP control page (Task 4), the project includes an **extended status web page**:

- Shows:
  - Latest sensor readings (T/H),
  - Environment status (5-level),
  - TinyML inference result,
  - WiFi mode/IP,
  - CoreIOT/Telegram status.
- Uses lightweight HTML generated from the shared data.
- Can be enabled/disabled via feature flags and accessed in both AP and STA modes.

Web server/WebSocket details (from `task_webserver.*` and `task_handler.*`):
- Files are served from LittleFS: `/` → `index.html`, plus `/script.js` and `/styles.css`.
- WebSocket endpoint `/ws` supports:
  - `{"action":"control_static","id":"btn-led1|btn-led2","status":"ON|OFF"}` to toggle LED/Neo tasks via semaphores.
  - `{"action":"get_sys_info"}` to request current WiFi/CoreIOT info.
  - `{"page":"setting","value":{"ssid","password","token","server","port"}}` to save credentials to flash (`Save_info_File`) and broadcast updated sys info.
  - Simple GPIO writes via `{ "page":"device", "value": { "gpio", "status" } }` for quick testing.

This page works as a **local dashboard** for quickly inspecting the node without opening Serial or Telegram.

---

## 5. Configuration Manual (Key Parameters from `.configuration.h`)

Below is a condensed list of important configuration options taken from `.configuration.h`:

| **Parameter**               | **Type** | **Example default** | **Description**                                         |
|-----------------------------|----------|---------------------|---------------------------------------------------------|
| **Mode Settings**           |          |                     |                                                         |
| `IS_DEBUG_MODE`             | bool     | `false`             | Enable/disable verbose Serial debug output.             |
| `IS_SHOW_DHT20_STATUS`      | bool     | `false`             | Show DHT20 sensor status logs.                          |
| `IS_SHOW_LED_STATUS`        | bool     | `false`             | Show status logs for the normal LED task.               |
| `IS_SHOW_NEO_STATUS`        | bool     | `false`             | Show status logs for the NeoPixel task.                 |
| `IS_SHOW_LCD_STATUS`        | bool     | `false`             | Show status logs for the LCD task.                      |
| `IS_SHOW_PAYLOAD`           | bool     | `false`             | Print CoreIOT / MQTT payloads when sending data.        |
| `IS_SHOW_INFERENCE_RESULT`  | bool     | `false`             | Print TinyML inference results over Serial.             |
| `IS_SHOW_BOT_STATUS`        | bool     | `false`             | Show Telegram bot status logs.                          |
| `IS_SHOW_SENSOR_LOG`        | bool     | `false`             | Periodically log sensor readings.                       |
| **Time Delays**             |          |                     |                                                         |
| `LED_BLINKY_DELAY_MS`       | int      | `1000`              | Base delay between temperature LED updates.             |
| `NEO_BLINKY_DELAY_MS`       | int      | `1000`              | Delay between NeoPixel humidity updates.                |
| `TEMP_HUMI_DELAY_MS`        | int      | `1000`              | Interval for reading DHT20 and updating LCD/web.        |
| `MAIN_SERVER_DELAY_MS`      | int      | `1000`              | Period of the main web/server loop.                     |
| `TINY_ML_DELAY_MS`          | int      | `5000`              | Interval between TinyML inference runs.                 |
| `POLL_FROM_SERVER_DELAY_MS` | int      | `1000`              | How often to poll commands from the server/CoreIOT.     |
| `CORE_IOT_DELAY_MS`         | int      | `10000`             | Interval for publishing data to CoreIOT.                |
| `LED_READER_DELAY_MS`       | int      | `1000`              | Period for LED-related sensor reading helpers.          |
| `HUMID_READER_DELAY_MS`     | int      | `1000`              | Period for humidity-related reading helpers.            |
| `LONG_PRESS_MS`             | int      | `3000`              | Long-press detection window.                            |
| `DEBOUNCE_MS`               | int      | `50`                | Button debounce interval.                               |
| `WIFI_CONNECT_TIMEOUT_MS`   | int      | `10000`             | Timeout when trying to connect to WiFi.                 |
| `WIFI_RETRY_INTERVAL_MS`    | int      | `5000`              | Delay before retrying a failed WiFi connection.         |
| `MQTT_RETRY_INTERVAL_MS`    | int      | `5000`              | Delay before retrying a failed MQTT connection/publish. |
| `SENSOR_LOG_DELAY_MS`       | int      | `2000`              | Interval for logging sensor values to Serial.           |
| **GPIO Pins**               |          |                     |                                                         |
| `BOOT_PIN`                  | int      | `0`                 | GPIO for boot pin                                       |
| `LED_PIN`                   | int      | `48`                | GPIO for the single temperature indicator LED.          |
| `NEO_LED_PIN`               | int      | `45`                | GPIO for the NeoPixel data line.                        |
| `NEO_LED_NUMBER`            | int      | `8`                 | Number of pixels in the NeoPixel strip.                 |
| **I2C Pins**                |          |                     |                                                         |
| `I2C_SDA_PIN`               | int      | `11`                | I²C SDA pin used by DHT20 and LCD.                      |
| `I2C_SCL_PIN`               | int      | `12`                | I²C SCL pin used by DHT20 and LCD.                      |

> **Note:** WiFi SSID/password, CoreIOT tokens, and Telegram bot tokens are stored in other configuration headers and are not listed here. Temperature bands for LED blinking (`led_blinky.*`) and humidity bands for NeoPixel colors (`neo_blinky.*`) are code-level constants, not entries in `.configuration.h`.

---

## 6. Build & Deployment (Short)

1. Install **PlatformIO** (VS Code extension or CLI).
2. Clone this repository and open it in PlatformIO.
3. Edit **`.configuration.h`**:
   - Map pins to your actual wiring (LED, NeoPixel, LCD, DHT20).
   - Tune task periods, logging intervals, TinyML and CoreIOT delays.
4. Configure WiFi/CoreIOT/Telegram in the corresponding configuration files.
5. Select the correct environment for **ESP32-S3 / YOLO UNO** in `platformio.ini`.
6. Build & upload:

   ```bash
   pio run
   pio run --target upload
   pio device monitor
   ```

> Security/OTA: ElegantOTA is enabled via the web server; set OTA credentials if used publicly, and rotate Telegram/CoreIOT tokens before sharing firmware or pushing code.

---

## 7. Usage Overview

- **Local indicators:**
  - The **temperature LED** cycles through 5 blink patterns representing COLD → WARNING.
  - The **NeoPixel strip** shows 7 rainbow colors according to humidity and **white when humidity > 100% or the sensor reading is invalid**.
  - The **LCD** shows numeric temperature/humidity and the combined 5-level environment status  
    (`COLD / IDEAL / NORMAL / HOT / WARNING`).

- **Web UI:**
  - The board brings up AP mode with `SSID_AP` / `PASS_AP`; STA reconnect uses stored WiFi creds (saved via the web UI setting form).
  - Browse `http://192.168.4.1/` (AP) or the STA IP to load the page; WebSocket endpoint `/ws` handles LED/Neo toggles (`btn-led1`, `btn-led2`) and saving WiFi/CoreIOT credentials to flash.
  - `/status` (AP or STA) shows the extended dashboard data.

- **Telegram:**
  - Open the chat with your bot and use:
    - `/start` to see help and available commands.
    - `/status` to see current temperature, humidity, WARNING flag, TinyML result and LED states.
  - You will automatically receive:
    - A message when the bot starts,
    - A **⚠ WARNING** when T/H leaves the HCMC “normal” range,
    - A **✅ Back to normal** message when conditions recover.

- **CoreIOT & Simulators:**
  - Enable CoreIOT publishing and point the endpoint to either the real CoreIOT service or the local simulator.
  - Verify payloads in the CoreIOT dashboard or via simulator logs.

---

## 8. TinyML Workflow (High-Level)

1. **Log data** (temperature/humidity and state) from Serial using the Python logger script.
2. **Train** a small classification model in Python:
   - Preprocess features and labels using HCMC-based thresholds.
   - Evaluate performance (accuracy, confusion matrix).
3. **Export** the model to a C header (TinyML format).
4. **Integrate** into the firmware:
   - Include the generated header.
   - Call inference from the TinyML task at `TINY_ML_DELAY_MS` intervals.
5. **Validate** predictions on the board and iterate:
   - If performance is not good enough, collect more data and retrain.

### TinyML Evaluation & Plots

- The evaluation scripts in `python/Tiny ML` (`all_plot.py`, `model_verify.py`, `model_tester.py`) run multi-split tests and dump plots.
- Key artifacts (already generated) live in `python/Tiny ML/plots/` and `python/Tiny ML/plots/detail plots 100/` (and `...5000/` for more runs). The previews below point to the `detail plots 100` set:
  - `metrics_histograms.png` – distribution of Accuracy / Precision / Recall / F1 across random splits.
  - `decision_boundary_2d.png` – decision surface over temperature vs. humidity with data points.
  - `metrics_mean_std.png` – mean ± std of Accuracy / Precision / Recall / F1.
  - `ref_run_confusion_matrix_normalized.png` – normalized confusion matrix for a reference split.
  - `ref_run_probability_hist.png` – predicted anomaly probability histogram by class.
  - `ref_run_3d_scatter_prob.png` – 3D scatter of (temp, humidity, anomaly prob).
  - `ref_run_threshold_sweep.png` – how Accuracy/Precision/Recall/F1 change vs. decision threshold.

- Preview of the generated performance plots:

  ![TinyML metric distributions](python/Tiny%20ML/plots/detail%20plots%20100/metrics_histograms.png)
  ![TinyML decision boundary](python/Tiny%20ML/plots/detail%20plots%20100/decision_boundary_2d.png)
  ![TinyML metrics mean±std](python/Tiny%20ML/plots/metrics_mean_std.png)
  ![TinyML normalized confusion matrix](python/Tiny%20ML/plots/detail%20plots%20100/ref_run_confusion_matrix_normalized.png)
  ![TinyML probability distribution](python/Tiny%20ML/plots/detail%20plots%20100/ref_run_probability_hist.png)
  ![TinyML 3D scatter](python/Tiny%20ML/plots/detail%20plots%20100/ref_run_3d_scatter_prob.png)
  ![Threshold sweep](python/Tiny%20ML/plots/detail%20plots%20100/ref_run_threshold_sweep.png)

---

## 9. CoreIOT Integration & Testing

- **Real deployment:**
  - Use your actual CoreIOT device token and endpoint.
  - Monitor data on the CoreIOT dashboard.

- **Development / testing:**
  - Run the Python CoreIOT simulator.
  - Point the endpoint in configuration to the simulator URL.
  - Inspect received JSON payloads and adjust the firmware accordingly.

---

## 10. Credits

- Original RTOS template and assignment: **YoloUNO_PlatformIO – RTOS_Project** by the course instructor.
- Hardware platform: **YOLO UNO ESP32 / ESP32-S3** and peripheral modules by **OhStem**.
- Cloud platform: **CoreIOT**.
- Technologies: **FreeRTOS**, **PlatformIO**, **ESP32 WiFi**, **TinyML**, **Telegram Bot API**, **Python** (for tooling and simulators).
