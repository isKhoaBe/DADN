#include "fan_control.h"
#include "Arduino.h"
#include "global.h"

#define FAN_PIN 4
#define TEMP_THRESHOLD 32.0f
#define HUMI_THRESHOLD 80.0f

static bool is_fan_on = false;

void setup_fan_control()
{
    pinMode(FAN_PIN, OUTPUT);
    digitalWrite(FAN_PIN, LOW); // Default to off
    is_fan_on = false;
    Serial.println("[INIT] Fan Control ready");
}

void turn_fan_on()
{
    if (!is_fan_on)
    {
        digitalWrite(FAN_PIN, HIGH);
        is_fan_on = true;
        Serial.println("[FAN_CONTROL] Fan turned ON");
    }
}

void turn_fan_off()
{
    if (is_fan_on)
    {
        digitalWrite(FAN_PIN, LOW);
        is_fan_on = false;
    }
}

void fan_control_task(void *pvParameters)
{
    setup_fan_control();

    while (1)
    {
        float temperature = 0.0f;
        float humidity = 0.0f;
        bool data_valid = false;

        // Try to read the latest sensor data from the global variables
        if (xSemaphoreTake(xDHT20Semaphore, pdMS_TO_TICKS(10)) == pdTRUE)
        {
            temperature = sensorData.temperature;
            humidity = sensorData.humidity;
            xSemaphoreGive(xDHT20Semaphore);
            data_valid = true;
        }

        if (data_valid && !isnan(temperature) && !isnan(humidity))
        {
            // Turn fan on if temp is hotter than threshold OR humidity is higher than threshold
            if (temperature > TEMP_THRESHOLD || humidity > HUMI_THRESHOLD)
            {
                turn_fan_on();
            }
            else
            {
                turn_fan_off();
            }
        }

        vTaskDelay(pdMS_TO_TICKS(TEMP_HUMI_DELAY_MS));
    }
}
