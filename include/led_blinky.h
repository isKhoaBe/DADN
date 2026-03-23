#ifndef __LED_BLINKY__
#define __LED_BLINKY__

#include "global.h"
#include "temp_humi_monitor.h"

// Local defines
// clang-format off
#define BLINK_COLD      2000
#define BLINK_IDEAL     1700
#define BLINK_NORMAL    1300
#define BLINK_HOT       900
#define BLINK_WARNING   500
// clang-format on

void setup_led_blinky(void);
void led_blinky(void *pvParameters);

#endif