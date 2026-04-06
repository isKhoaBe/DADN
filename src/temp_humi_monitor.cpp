#include "temp_humi_monitor.h"
#include "supabase.h"

// OhStem LCD I2C address 0x21 == 33
LiquidCrystal_I2C lcd(33, 16, 2);

// HShop LCD I2C address 0x27 == 39
// LiquidCrystal_I2C lcd(0x27, 0, 2);

// extern AsyncWebSocket ws;

enum EnvStatus
{
	ENV_COLD = 0,
	ENV_IDEAL,
	ENV_NORMAL,
	ENV_HOT,
	ENV_WARNING,
	ENV_STATUS_COUNT
};

String status_LCD[ENV_STATUS_COUNT] = {
	"COLD",	   // ENV_COLD
	"IDEAL",   // ENV_IDEAL
	"NORMAL",  // ENV_NORMAL
	"HOT",	   // ENV_HOT
	"WARNING!" // ENV_WARNING
};

EnvStatus getEnvStatus(float temperature, float humidity)
{
	if ((temperature <= 20) && (60 < humidity && humidity <= 75))
		return ENV_COLD;
	else if ((20 < temperature && temperature <= 25) && (60 < humidity && humidity <= 75))
		return ENV_IDEAL;
	else if ((25 < temperature && temperature <= 30) && (60 < humidity && humidity <= 80))
		return ENV_NORMAL;
	else if ((30 < temperature && temperature <= 35) && (60 < humidity && humidity <= 80))
		return ENV_HOT;
	else
		return ENV_WARNING;
}

void displayLCD(const char *status, float temperature, float humidity)
{
	lcd.clear();
	lcd.setCursor(0, 0);
	lcd.print("Status: " + String(status));
	lcd.setCursor(0, 1);
	lcd.print("T:");
	lcd.print(temperature, 1);
	lcd.print("C H:");
	lcd.print(humidity, 1);
	lcd.print("%");

	if (IS_DEBUG_MODE || IS_SHOW_LCD_STATUS)
	{
		Serial.printf("[LCD] Status: %s | T: %.1fC H: %.1f%%\n", status, temperature, humidity);
	}
}

void temp_humi_monitor(void *pvParameters)
{
	setup_temp_humi_monitor();

	while (1)
	{
		static float temperature = 0.0f;
		static float humidity = 0.0f;

		if (xSemaphoreTake(xDHT20Semaphore, pdMS_TO_TICKS(10)) == pdTRUE)
		{
			temperature = sensorData.temperature;
			humidity = sensorData.humidity;
			xSemaphoreGive(xDHT20Semaphore);
		}

		if (isnan(temperature) || isnan(humidity))
		{
			Serial.println("Failed to read from DHT sensor!");
			vTaskDelay(pdMS_TO_TICKS(1000));
			continue;
		}

		EnvStatus status = getEnvStatus(temperature, humidity);
		displayLCD(status_LCD[status].c_str(), temperature, humidity);

		vTaskDelay(pdMS_TO_TICKS(TEMP_HUMI_DELAY_MS));
	}
}

void setup_temp_humi_monitor()
{
	Serial.println("[INIT] Temp & Humi Monitor tasks created successfully");

	Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

	lcd.begin();
	lcd.backlight();
}
