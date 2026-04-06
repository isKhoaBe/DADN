#include "task_wifi.h"

void startAP()
{
	WiFi.mode(WIFI_AP);
	WiFi.softAP(String(SSID_AP), String(PASS_AP));
	Serial.print("AP IP: ");
	Serial.println(WiFi.softAPIP());
}

void startSTA()
{
	if (WIFI_SSID.isEmpty())
	{
		// Provide default if empty, or just skip
		WIFI_SSID = "Huy gei";
		WIFI_PASS = "1234567890";
	}

	WiFi.mode(WIFI_STA);

	if (WIFI_PASS.isEmpty())
	{
		WiFi.begin(WIFI_SSID.c_str());
	}
	else
	{
		WiFi.begin(WIFI_SSID.c_str(), WIFI_PASS.c_str());
	}

	Serial.print("[WIFI] Connecting to ");
	Serial.println(WIFI_SSID);

	int retries = 0;
	while (WiFi.status() != WL_CONNECTED && retries < 20)
	{
		vTaskDelay(pdMS_TO_TICKS(500));
		Serial.print(".");
		retries++;
	}

	if (WiFi.status() == WL_CONNECTED)
	{
		Serial.println("\n[WIFI] Connected!");
		Serial.print("[WIFI] IP Address: ");
		Serial.println(WiFi.localIP());
		xSemaphoreGive(xBinarySemaphoreInternet);
	}
	else
	{
		Serial.println("\n[WIFI] Failed to connect.");
	}
}

bool Wifi_reconnect()
{
	const wl_status_t status = WiFi.status();

	if (status == WL_CONNECTED)
	{
		return true;
	}

	startSTA();
	return false;
}

void wifi_task(void *pvParameters)
{
	// Give it a moment to let setup finish
	vTaskDelay(pdMS_TO_TICKS(1000));

	startSTA();

	while (1)
	{
		if (WiFi.status() != WL_CONNECTED)
		{
			Serial.println("[WIFI] Disconnected! Reconnecting...");
			Wifi_reconnect();
		}
		vTaskDelay(pdMS_TO_TICKS(10000)); // Check every 10 seconds
	}
}