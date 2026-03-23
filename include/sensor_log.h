#ifndef __SENSOR_LOG_H__
#define __SENSOR_LOG_H__

#include "global.h"
#include <DHT20.h>
#include <Wire.h>

void sensor_log(void *pvParameters);
void setup_sensor_log();

#endif