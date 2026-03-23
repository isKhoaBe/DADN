#include "Arduino.h"
#include "pir_sensor.h"

#define PIR_PIN 2

void setup_pir_sensor()
{
    pinMode(PIR_PIN, INPUT);
    Serial.println("[INIT] PIR Sensor ready");
}

void pir_sensor_task(void *pvParameters)
{
    setup_pir_sensor();

    while (true)
    {

        bool motion = digitalRead(PIR_PIN);

        if (motion)
        {
            Serial.println("[PIR] Motion detected!");
        }
        else
        {
            Serial.println("[PIR] No motion");
        }

        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}