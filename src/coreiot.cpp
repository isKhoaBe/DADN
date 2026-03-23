#include "coreiot.h"

// ----------- CONFIGURE THESE! -----------
const char *coreIOT_Server = "app.coreiot.io";
const char *coreIOT_Token  = "3tK78ADDZd4MMoo3IwJG"; // Device Access Token
const int	mqttPort	   = 1883;
// ----------------------------------------

WiFiClient	 espClient;
PubSubClient client(espClient);

String method_led_blinky = "setValueLedBlinky";
String method_neo_led	 = "setValueNeoLed";

void reconnect() {
	// Loop until we're reconnected
	while (!client.connected()) {
		Serial.println("Attempting MQTT connection... ");

		// Setup for broker connection
		// String clientId = "ESP32Client-";
		// clientId += String(random(0xffff), HEX);

		// if (client.connect(clientId.c_str())) {

		// Serial.println("connected to CoreIOT Server!");
		// client.subscribe("v1/devices/me/attributes");
		// Serial.println("Subscribed to v1/devices/me/attributes");

		// Setup for CoreIOT connection
		// Attempt to connect (username=token, password=empty)
		if (client.connect("ESP32 Client", CORE_IOT_TOKEN.c_str(), NULL)) {
			Serial.println("Connected to CoreIOT Server!");
			client.subscribe("v1/devices/me/rpc/request/+");
			Serial.println("Subscribed to v1/devices/me/rpc/request/+");
		}
		else {
			Serial.print("failed, rc=");
			Serial.print(client.state());
			Serial.println(" try again in 5 seconds");
			delay(5000);
		}
	}
}

void callback(char *topic, byte *payload, unsigned int length) {
	Serial.print("Message arrived [");
	Serial.print(topic);
	Serial.println("] ");

	if (length == 0) {
		Serial.println("⚠️ Empty payload received!");
		return;
	}

	// Allocate a temporary buffer for the message
	char message[length + 1];
	memcpy(message, payload, length);
	message[length] = '\0';

	Serial.print("Payload: ");
	Serial.println(message);

	// Parse JSON
	StaticJsonDocument<256> doc;
	DeserializationError	error = deserializeJson(doc, message);

	if (error) {
		Serial.print("deserializeJson() failed: ");
		Serial.println(error.c_str());
		return;
	}

	const char *method = doc["method"];

	if (method == nullptr) {
		Serial.println("⚠️ 'method' field not found in JSON!");
		return;
	}
	else if (strcmp(method, method_led_blinky.c_str()) == 0) {
		// Check params type (could be boolean, int, or string according to your RPC)
		// Example: {"method": "setValueLED", "params": "ON"}
		// const char* params = doc["params"];

		if (!doc["params"].is<bool>()) {
			Serial.println("params is not bool!");
			return;
		}

		if (doc["params"].is<bool>()) {
			bool state = doc["params"].as<bool>();

			if (xSemaphoreTake(xLedStateSemaphore, portMAX_DELAY) == pdTRUE) {
				is_LED_on = state ? true : false;
				xSemaphoreGive(xLedStateSemaphore);
			}

			Serial.println("LED Blinky is turned " + String(state ? "ON" : "OFF") + " (bool)");

			String feedback = "{\"LedState\":";
			feedback += (state ? "true" : "false");
			feedback += "}";

			client.publish("v1/devices/me/attributes", feedback.c_str());
			Serial.println("Published LED state to server: " + feedback);
		}
		else if (doc["params"].is<const char *>()) {
			const char *param = doc["params"];

			if (param && strcmp(param, "ON") == 0) {
				if (xSemaphoreTake(xLedStateSemaphore, portMAX_DELAY) == pdTRUE) {
					is_LED_on = true;
					xSemaphoreGive(xLedStateSemaphore);
				}
				Serial.println("LED Blinky is turned ON (string)");
			}
			else {
				if (xSemaphoreTake(xLedStateSemaphore, portMAX_DELAY) == pdTRUE) {
					is_LED_on = false;
					xSemaphoreGive(xLedStateSemaphore);
				}
				Serial.println("LED Blinky is turned OFF (string)");
			}
		}
	}
	else if (strcmp(method, method_neo_led.c_str()) == 0) {
		// Example: {"method": "setValueLED", "params": "OFF"}
		// const char* params = doc["params"];

		if (!doc["params"].is<bool>()) {
			Serial.println("params is not bool!");
			return;
		}

		bool state = doc["params"].as<bool>(); // lấy trực tiếp bool

		if (doc["params"].is<bool>()) {
			bool state = doc["params"].as<bool>(); // lấy trực tiếp bool

			if (xSemaphoreTake(xNeoLedStateSemaphore, portMAX_DELAY) == pdTRUE) {
				is_NeoLED_on = state ? true : false;
				xSemaphoreGive(xNeoLedStateSemaphore);
			}

			Serial.println("NeoLED is turned " + String(state ? "ON" : "OFF") + " (bool)");

			String feedback = "{\"NeoLedState\":";
			feedback += (state ? "true" : "false");
			feedback += "}";

			client.publish("v1/devices/me/attributes", feedback.c_str());
			Serial.println("Published LED state to server: " + feedback);
		}
		else if (doc["params"].is<const char *>()) {
			const char *param = doc["params"];

			if (param && strcmp(param, "ON") == 0) {
				if (xSemaphoreTake(xNeoLedStateSemaphore, portMAX_DELAY) == pdTRUE) {
					is_NeoLED_on = true;
					xSemaphoreGive(xNeoLedStateSemaphore);
				}
				Serial.println("NeoLED is turned ON (string)");
			}
			else {
				if (xSemaphoreTake(xNeoLedStateSemaphore, portMAX_DELAY) == pdTRUE) {
					is_NeoLED_on = false;
					xSemaphoreGive(xNeoLedStateSemaphore);
				}
				Serial.println("NeoLED is turned OFF (string)");
			}
		}
	}
	else {
		Serial.print("Unknown method: ");
		Serial.println(method);
	}
}

void setup_coreiot() {
	// Kết nối wifi thủ công
	// Serial.print("Connecting to WiFi...");
	// WiFi.begin(wifi_ssid, wifi_password);

	Serial.println("[INIT] CoreIOT task created successfully.");

	while (1) {
		// if (WiFi.status() == WL_CONNECTED) {
		if (xSemaphoreTake(xBinarySemaphoreInternet, portMAX_DELAY) == pdTRUE) {
			break;
		}

		delay(500);
		Serial.print(".");
	}

	// client.setServer(coreIOT_Server, mqttPort);

	// Use global variables defined in global.cpp
	client.setServer(CORE_IOT_SERVER.c_str(), CORE_IOT_PORT.toInt());
	client.setCallback(callback);
}

void coreiot_task(void *pvParameters) {
	setup_coreiot();

	unsigned long lastTelemetry = 0;

	while (1) {
		if (!client.connected() && WiFi.status() == WL_CONNECTED) {
			reconnect();
		}
		client.loop();

		unsigned long now = millis();
		if (now - lastTelemetry >= CORE_IOT_DELAY_MS) {
			// Publish every 10 seconds
			// Sample payload, publish to 'v1/devices/me/telemetry'
			static float temperature = 0;
			static float humidity	 = 0;

			if (xSemaphoreTake(xDHT20Semaphore, pdMS_TO_TICKS(10)) == pdTRUE) {
				temperature = sensorData.temperature;
				humidity	= sensorData.humidity;
				xSemaphoreGive(xDHT20Semaphore);
			}

			String payload = "{\"temperature\":" + String(temperature) +
							 ",\"humidity\":" + String(humidity) + "}";

			client.publish("v1/devices/me/telemetry", payload.c_str());

			if (IS_SHOW_PAYLOAD) {
				Serial.println("Published payload: " + payload);
			}

			lastTelemetry = now;
		}

		vTaskDelay(pdMS_TO_TICKS(POLL_FROM_SERVER_DELAY_MS));
	}
}