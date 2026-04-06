#include "global.h"

#include "led_blinky.h"
#include "neo_blinky.h"
#include "temp_humi_monitor.h"
#include "coreiot.h"

#include "sensor_log.h"

// include task
#include "task_check_info.h"
#include "task_toogle_boot.h"
#include "task_wifi.h"
#include "task_core_iot.h"
#include "pir_sensor.h"
#include "light_sensor.h"
#include "light_control.h"

#include "dht20_reader.h"

void system_init();
void semaphore_init();

void setup()
{
	system_init();

	// Wait for everything to settle
	delay(1000);

	// Create tasks
	Serial.println("\n======= System initializing... =======\n");

	xTaskCreate(dht20_reader, "Task DHT20 Reader", 4096, NULL, 2, NULL);

	xTaskCreate(led_blinky, "Task LED Blinky", 4096, NULL, 2, NULL);
	// xTaskCreate(neo_blinky, "Task NEO Blinky", 4096, NULL, 2, NULL);
	xTaskCreate(temp_humi_monitor, "Task Temp & Humi Monitor", 4096, NULL, 2, NULL);
	// xTaskCreate(main_server_task, "Task Main Server", 10240, NULL, 2, NULL);
	xTaskCreate(Task_Toogle_BOOT, "Task_Toogle_BOOT", 8192, NULL, 2, NULL);

	xTaskCreate(wifi_task, "Task WiFi", 4096, NULL, 2, NULL);

	// xTaskCreate(sensor_log, "Sensor Output Task", 2048, NULL, 2, NULL);
	xTaskCreate(pir_sensor_task, "PIR Sensor Task", 4096, NULL, 2, NULL);
	xTaskCreate(light_sensor_task, "Light Sensor Task", 4096, NULL, 2, NULL);

	delay(100);
	Serial.println("\n===== System initialization completed. =====\n");
}

void loop()
{
}

void semaphore_init()
{
	// Init semaphores
	xDHT20Semaphore = xSemaphoreCreateMutex();

	xLedStateSemaphore = xSemaphoreCreateBinary();
	xNeoLedStateSemaphore = xSemaphoreCreateBinary();
	xBinarySemaphoreInternet = xSemaphoreCreateBinary();
	xInferenceResultSemaphore = xSemaphoreCreateBinary();

	// Unlock immediately for control tasks
	// Do not give internet semaphore at start
	xSemaphoreGive(xLedStateSemaphore);
	xSemaphoreGive(xNeoLedStateSemaphore);
	xSemaphoreGive(xInferenceResultSemaphore);
}

void system_init()
{
	// Initialize semaphores
	semaphore_init();

	Serial.begin(115200);
	delay(2000); // Wait for serial monitor to connect

	// Load configuration file (if exists)
	check_info_File(0);

	Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
	dht20.begin();
	setup_light_control();
}