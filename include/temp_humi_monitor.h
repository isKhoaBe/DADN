#ifndef __TEMP_HUMI_MONITOR__
#define __TEMP_HUMI_MONITOR__

#include "DHT20.h"
#include "LiquidCrystal_I2C.h"
#include "global.h"
#include <Arduino.h>
#include <ArduinoJson.h>       // Cần để hiểu JsonDocument là gì
#include <ESPAsyncWebServer.h> // Cần để hiểu AsyncWebSocket là gì

void temp_humi_monitor(void *pvParameters);
void setup_temp_humi_monitor();
void displayLCD(const char *title, float temperature, float humidity);

#endif