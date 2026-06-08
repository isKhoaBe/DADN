#include "task_ai_relay.h"
#include "Arduino.h"
#include "supabase.h"

// Define the Door Lock Relay Pin (e.g. Pin 5)
#define DOOR_LOCK_RELAY_PIN 8

static bool is_door_unlocked = false;

void setup_ai_relay()
{
    pinMode(DOOR_LOCK_RELAY_PIN, OUTPUT);
    digitalWrite(DOOR_LOCK_RELAY_PIN, LOW); // Default to locked (LOW)
    is_door_unlocked = false;

    Serial0.begin(115200); // Initialize Serial for communication with Python script

    Serial.println("[INIT] AI Door Lock Relay ready (Listening on main Serial)");
}

void ai_relay_task(void *pvParameters)
{
    setup_ai_relay();

    while (1)
    {
        if (Serial0.available() > 0)
        {
            // Read incoming command from Python script via CH340
            String command = Serial0.readStringUntil('\n');
            command.trim(); // Remove any extra whitespace/carriage return

            if (command == "yes")
            {
                if (!is_door_unlocked)
                {
                    digitalWrite(DOOR_LOCK_RELAY_PIN, HIGH); // Unlock door
                    is_door_unlocked = true;
                    Serial.println("[AI_RELAY] Face Recognized! Door UNLOCKED.");
                    sendAlertToSupabase("DOOR_UNLOCK", "success", "Face recognized: unlocking door");
                }
            }
            else if (command == "no")
            {
                if (is_door_unlocked)
                {
                    digitalWrite(DOOR_LOCK_RELAY_PIN, LOW); // Lock door
                    is_door_unlocked = false;
                    Serial.println("[AI_RELAY] Stranger/No Face. Door LOCKED.");
                    sendAlertToSupabase("DOOR_LOCK", "warning", "Stranger or no face detected: locking door");
                }
            }
            else if (command.length() > 0)
            {
                Serial.print("[AI_RELAY] Unknown command received: ");
                Serial.println(command);
            }
        }

        // Small delay to prevent task from hogging the CPU
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}
