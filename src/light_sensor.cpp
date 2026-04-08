#include "light_sensor.h"
#include "Arduino.h"
#include "light_control.h"
#include "global.h"

#define LIGHT_SENSOR_PIN 1
#define DARK_THRESHOLD 1000

void setup_light_sensor()
{
    pinMode(LIGHT_SENSOR_PIN, INPUT);
    Serial.println("[INIT] Light Sensor ready");
}

void light_sensor_task(void *pvParameters)
{
    setup_light_sensor();

    static bool was_dark = false;

    while (true)
    {
        int light_level = analogRead(LIGHT_SENSOR_PIN);
        
        // Update global sensor data
        if (xSemaphoreTake(xDHT20Semaphore, pdMS_TO_TICKS(10)) == pdTRUE) {
            sensorData.light_level = (float)light_level;
            xSemaphoreGive(xDHT20Semaphore);
        }

        if (light_level < DARK_THRESHOLD)
        {
            if (!was_dark) {
                Serial.println("[LIGHT] It's dark, turning light ON");
                was_dark = true;
            }
            turn_inside_light_on();
        }
        else
        {
            was_dark = false;
            turn_inside_light_off();
        }

        vTaskDelay(pdMS_TO_TICKS(5000)); // Check every 5 seconds
    }
}
