#include "fan_control.h"
#include "Arduino.h"

#define FAN_PIN 13 // Example pin, please change if needed

void setup_fan_control()
{
    pinMode(FAN_PIN, OUTPUT);
    digitalWrite(FAN_PIN, LOW); // Default to off
    Serial.println("[INIT] Fan Control ready");
}

void turn_fan_on()
{
    digitalWrite(FAN_PIN, HIGH);
    Serial.println("[FAN_CONTROL] Fan turned ON");
}

void turn_fan_off()
{
    digitalWrite(FAN_PIN, LOW);
    Serial.println("[FAN_CONTROL] Fan turned OFF");
}
