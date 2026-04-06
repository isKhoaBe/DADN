#include "light_control.h"
#include "Arduino.h"

// We will define which pin is connected to the relay later
#define FRONT_DOOR_RELAY_PIN 3
#define INSIDE_LIGHT_RELAY_PIN 6

void setup_light_control()
{
    pinMode(FRONT_DOOR_RELAY_PIN, OUTPUT);
    digitalWrite(FRONT_DOOR_RELAY_PIN, LOW); // Default to off
    pinMode(INSIDE_LIGHT_RELAY_PIN, OUTPUT);
    digitalWrite(INSIDE_LIGHT_RELAY_PIN, LOW); // Default to off
    Serial.println("[INIT] Light Control ready");
}

void turn_front_door_light_on()
{
    digitalWrite(FRONT_DOOR_RELAY_PIN, HIGH);
    Serial.println("[LIGHT_CONTROL] Front door light turned ON");
}

void turn_front_door_light_off()
{
    digitalWrite(FRONT_DOOR_RELAY_PIN, LOW);
    Serial.println("[LIGHT_CONTROL] Front door light turned OFF");
}

void turn_inside_light_on()
{
    digitalWrite(INSIDE_LIGHT_RELAY_PIN, HIGH);
    Serial.println("[LIGHT_CONTROL] Inside light turned ON");
}

void turn_inside_light_off()
{
    digitalWrite(INSIDE_LIGHT_RELAY_PIN, LOW);
    Serial.println("[LIGHT_CONTROL] Inside light turned OFF");
}
