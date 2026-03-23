#include "dht20_reader.h"

void dht20_reader(void *pvParameters) {
	setup_dht20_reader();

	while (1) {
		if (xSemaphoreTake(xDHT20Semaphore, pdMS_TO_TICKS(20)) == pdTRUE) {
			boolean is_success = false;

			dht20.read();
			float humid = dht20.getHumidity();
			float temp	= dht20.getTemperature();

			if (!isnan(humid) && !isnan(temp)) {
				sensorData.humidity	   = humid;
				sensorData.temperature = temp;
				is_success			   = true;
			}

			xSemaphoreGive(xDHT20Semaphore);

			if (IS_DEBUG_MODE || IS_SHOW_DHT20_STATUS) {
				if (is_success) {
					Serial.printf("[DHT20] Humidity: %.2f %%, Temperature: %.2f °C\n", humid, temp);
				}
				else {
					Serial.println("[DHT20] Failed to read data from DHT20 sensor!");
				}
			}
		}

		vTaskDelay(pdMS_TO_TICKS(1000));
	}
}

void setup_dht20_reader() {
	// TODO
	Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
	dht20.begin();

	if (xDHT20Semaphore == NULL) {
		Serial.println("[ERROR] DHT20 Reader task has not been created");
	}
	else {
		Serial.println("[INIT] DHT20 Reader task created successfully");
	}
}