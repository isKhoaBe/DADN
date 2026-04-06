#include "light_sensor.h"
#include "Arduino.h"
#include "light_control.h"

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

    while (true)
    {
        int light_level = analogRead(LIGHT_SENSOR_PIN);
        Serial.print("[LIGHT] ADC Value: ");
        Serial.println(light_level);

        if (light_level < DARK_THRESHOLD)
        {
            Serial.println("[LIGHT] It's dark, turning light ON");
            turn_inside_light_on();
        }
        else
        {
            Serial.println("[LIGHT] It's bright enough, turning light OFF");
            turn_inside_light_off();
        }

        vTaskDelay(pdMS_TO_TICKS(5000)); // Check every 5 seconds
    }
}
