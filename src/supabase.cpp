#include "supabase.h"
#include "global.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

// --- IMPORTANT ---
// 1. Replace with your Supabase Project URL
const char *SUPABASE_URL = "https://cwqdsnudpdrbvgoqujlb.supabase.co";
// 2. Replace with your Supabase Service Role Key (or anon key if policies are set up)
const char *SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWRzbnVkcGRyYnZnb3F1amxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MDk4MzEsImV4cCI6MjA5MDI4NTgzMX0.6Zb_L0-imQO1uJsPsocQvfqRChDFRpcy3FBQ4KRBVNU";
// 3. This should match the table name in your schema.sql
const char *SUPABASE_TABLE_NAME = "sensor_readings";
// 4. Set the ID for this device from your 'devices' table in Supabase.
//    Please VERIFY this ID in your Supabase table.
const int SUPABASE_DEVICE_ID = 1; // Assuming 'YB_01' is device ID 1
// ----------------

void sendDataToSupabase(float temp, float humi, float light)
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("Cannot send data to Supabase, WiFi not connected.");
        return;
    }

    HTTPClient http;

    // The "rest/v1" is the standard path for the REST API
    String api_path = String(SUPABASE_URL) + "/rest/v1/" + SUPABASE_TABLE_NAME;

    // Create JSON document to match the 'sensor_readings' table
    JsonDocument doc;
    doc["device_id"] = SUPABASE_DEVICE_ID;
    doc["temperature"] = temp;
    doc["humidity"] = humi;
    doc["light_level"] = light;

    String jsonString;
    serializeJson(doc, jsonString);

    // Configure HTTP request
    http.begin(api_path);
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Prefer", "return=minimal"); // We don't need data back

    // Send POST request
    int httpResponseCode = http.POST(jsonString);

    http.end(); // Free resources
}

void sendAlertToSupabase(String alert_type, String severity, String message)
{
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    String api_path = String(SUPABASE_URL) + "/rest/v1/alerts";

    JsonDocument doc;
    doc["device_id"] = SUPABASE_DEVICE_ID;
    doc["alert_type"] = alert_type;
    doc["severity"] = severity;
    doc["message"] = message;

    String jsonString;
    serializeJson(doc, jsonString);

    http.begin(api_path);
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Prefer", "return=minimal");

    http.POST(jsonString);
    http.end();
}
