#ifndef __COREIOT_H__
#define __COREIOT_H__

#include "global.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>

void reconnect();
void callback(char *topic, byte *payload, unsigned int length);
void setup_coreiot();
void coreiot_task(void *pvParameters);

#endif