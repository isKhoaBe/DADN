#include "light_control.h"
#include "Arduino.h"
#include "supabase.h"

// We will define which pin is connected to the relay later
#define FRONT_DOOR_RELAY_PIN 3
#define INSIDE_LIGHT_RELAY_PIN 6

static bool is_front_door_light_on = false;
static bool is_inside_light_on = false;

void setup_light_control()
{
    pinMode(FRONT_DOOR_RELAY_PIN, OUTPUT);
    digitalWrite(FRONT_DOOR_RELAY_PIN, LOW); // Default to off
    pinMode(INSIDE_LIGHT_RELAY_PIN, OUTPUT);
    digitalWrite(INSIDE_LIGHT_RELAY_PIN, LOW); // Default to off
    is_front_door_light_on = false;
    is_inside_light_on = false;
    Serial.println("[INIT] Light Control ready");
}

void turn_front_door_light_on()
{
    if (!is_front_door_light_on)
    {
        digitalWrite(FRONT_DOOR_RELAY_PIN, HIGH);
        is_front_door_light_on = true;
        Serial.println("[LIGHT_CONTROL] Front door light turned ON");
        sendAlertToSupabase("OUTSIDE_LIGHT_ON", "routine", "Front door light turned ON");
    }
}

void turn_front_door_light_off()
{
    if (is_front_door_light_on)
    {
        digitalWrite(FRONT_DOOR_RELAY_PIN, LOW);
        is_front_door_light_on = false;
        sendAlertToSupabase("OUTSIDE_LIGHT_OFF", "routine", "Front door light turned OFF");
    }
}

void turn_inside_light_on()
{
    if (!is_inside_light_on)
    {
        digitalWrite(INSIDE_LIGHT_RELAY_PIN, HIGH);
        is_inside_light_on = true;
        Serial.println("[LIGHT_CONTROL] Inside light turned ON");
        sendAlertToSupabase("INSIDE_LIGHT_ON", "routine", "Low ambient light: Inside light turned ON");
    }
}

void turn_inside_light_off()
{
    if (is_inside_light_on)
    {
        digitalWrite(INSIDE_LIGHT_RELAY_PIN, LOW);
        is_inside_light_on = false;
        sendAlertToSupabase("INSIDE_LIGHT_OFF", "routine", "Inside light turned OFF");
    }
}
