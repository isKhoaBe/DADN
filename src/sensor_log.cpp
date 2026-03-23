#include "sensor_log.h"

int customValue;

void sensor_log(void *pvParameters) {
	setup_sensor_log();

	while (1) {
		dht20.read();
		float temperature = dht20.getTemperature();
		float humidity	  = dht20.getHumidity();

		if (temperature < 20 || temperature > 40 || humidity < 60 || humidity > 80) {
			customValue = 1;
		}
		else {
			customValue = 0;
		}

		if (isnan(temperature) || isnan(humidity)) {
			Serial.println("NaN,NaN,NaN");
		}
		else {
			if (IS_DEBUG_MODE || IS_SHOW_SENSOR_LOG) {
				Serial.printf("Temperature: %.2f C, Humidity: %.2f %% | Custom Value: %d\n", temperature, humidity, customValue);
			}
			else {
				Serial.printf("%d,%d,%d\n", (int)round(temperature), (int)round(humidity), customValue);
			}
		}

		vTaskDelay(pdMS_TO_TICKS(SENSOR_LOG_DELAY_MS)); // 2000ms = 2s
	}
}

void setup_sensor_log() {
	// TODO
	Serial.begin(115200);
	Serial.println("DHT20 Task Started!");

	Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
	dht20.begin();
}