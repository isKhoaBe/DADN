#ifndef __SUPABASE_H__
#define __SUPABASE_H__

#include <Arduino.h>

void sendDataToSupabase(float temp, float humi, float light);
void sendAlertToSupabase(String alert_type, String severity, String message);

#endif // __SUPABASE_H__
