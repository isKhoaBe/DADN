#include "supabase.h"
#include "global.h"
#include <ArduinoJson.h>
#include <HttpClient.h>
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

void sendDataToSupabase(float temp, float humi)
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("Cannot send data to Supabase, WiFi not connected.");
        return;
    }

    WiFiClient wifi;
    HttpClient client = HttpClient(wifi, SUPABASE_URL, 443);

    // The "rest/v1" is the standard path for the REST API
    String api_path = "/rest/v1/";
    api_path += SUPABASE_TABLE_NAME;

    Serial.println("Attempting to send data to Supabase...");
    Serial.print("API Path: ");
    Serial.println(api_path);

    // Create JSON document to match the 'sensor_readings' table
    JsonDocument doc;
    doc["device_id"] = SUPABASE_DEVICE_ID;
    doc["temperature"] = temp;
    doc["humidity"] = humi;

    String jsonString;
    serializeJson(doc, jsonString);

    // Set headers
    client.beginRequest();
    client.post(api_path.c_str());
    client.sendHeader("apikey", SUPABASE_KEY);
    client.sendHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
    client.sendHeader("Content-Type", "application/json");
    client.sendHeader("Prefer", "return=minimal"); // We don't need data back
    client.sendHeader("Content-Length", jsonString.length());
    client.beginBody();
    client.print(jsonString);
    client.endRequest();

    // Read the response
    int statusCode = client.responseStatusCode();
    String response = client.responseBody();

    Serial.print("Supabase status code: ");
    Serial.println(statusCode);
    Serial.print("Supabase response: ");
    Serial.println(response);
}
