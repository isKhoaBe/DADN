#ifndef __DHT20_READER_H__
#define __DHT20_READER_H__

#include "DHT20.h"
#include "LiquidCrystal_I2C.h"
#include "global.h"
#include <Arduino.h>

void setup_dht20_reader();
void dht20_reader(void *pvParameters);

#endif