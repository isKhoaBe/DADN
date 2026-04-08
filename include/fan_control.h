#ifndef FAN_CONTROL_H
#define FAN_CONTROL_H

void setup_fan_control();
void turn_fan_on();
void turn_fan_off();
void fan_control_task(void *pvParameters);

#endif // FAN_CONTROL_H