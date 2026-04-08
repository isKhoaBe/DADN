#include "task_supabase.h"
#include "global.h"
#include "supabase.h"
#include "Arduino.h"

#define SUPABASE_SEND_DELAY_MS 5000 // Send data every 30 seconds

void setup_task_supabase()
{
    Serial.println("[INIT] Supabase Data Task ready");
}

void task_supabase(void *pvParameters)
{
    setup_task_supabase();

    while (true)
    {
        float current_temp = 0.0f;
        float current_humi = 0.0f;
        float current_light = 0.0f;

        // Take the semaphore to safely read the sensor data
        if (xSemaphoreTake(xDHT20Semaphore, pdMS_TO_TICKS(50)) == pdTRUE)
        {
            current_temp = sensorData.temperature;
            current_humi = sensorData.humidity;
            current_light = sensorData.light_level;
            xSemaphoreGive(xDHT20Semaphore);

            // Check if we have valid readings (not NaN)
            if (!isnan(current_temp) && !isnan(current_humi))
            {
                sendDataToSupabase(current_temp, current_humi, current_light);
            }
            else
            {
                Serial.println("[SUPABASE] Skipping send: Invalid sensor data.");
            }
        }
        else
        {
            Serial.println("[SUPABASE] Failed to acquire sensor data semaphore.");
        }

        vTaskDelay(pdMS_TO_TICKS(SUPABASE_SEND_DELAY_MS));
    }
}