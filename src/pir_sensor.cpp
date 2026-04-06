#include "Arduino.h"
#include "pir_sensor.h"
#include "light_control.h"

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
            turn_front_door_light_on();
        }
        else
        {
            Serial.println("[PIR] No motion");
            turn_front_door_light_off();
        }

        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}