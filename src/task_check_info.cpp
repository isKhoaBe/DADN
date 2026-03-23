#include "task_check_info.h"

boolean is_first_time = true;

void Load_info_File() {
	File file = LittleFS.open("/info.dat", "r");

	if (!file) {
		return;
	}

	DynamicJsonDocument	 doc(4096);
	DeserializationError error = deserializeJson(doc, file);

	if (error) {
		Serial.print(F("deserializeJson() failed: "));
	}
	else {
		WIFI_SSID		= strdup(doc["WIFI_SSID"]);
		WIFI_PASS		= strdup(doc["WIFI_PASS"]);
		CORE_IOT_TOKEN	= strdup(doc["CORE_IOT_TOKEN"]);
		CORE_IOT_SERVER = strdup(doc["CORE_IOT_SERVER"]);
		CORE_IOT_PORT	= strdup(doc["CORE_IOT_PORT"]);
	}
	file.close();

	if (IS_DEBUG_MODE) {
		Serial.println("✅ Config Loaded.");
	}
}

void Delete_info_File() {
	Serial.println("⚠️ Factory Reset initiated. Deleting configuration file...");

	if (LittleFS.exists("/info.dat")) {
		LittleFS.remove("/info.dat");
	}

	ESP.restart();
}

void Save_info_File(String WIFI_SSID, String WIFI_PASS, String CORE_IOT_TOKEN,
					String CORE_IOT_SERVER, String CORE_IOT_PORT) {
	Serial.println(WIFI_SSID);
	Serial.println(WIFI_PASS);

	DynamicJsonDocument doc(4096);
	doc["WIFI_SSID"]	   = WIFI_SSID;
	doc["WIFI_PASS"]	   = WIFI_PASS;
	doc["CORE_IOT_TOKEN"]  = CORE_IOT_TOKEN;
	doc["CORE_IOT_SERVER"] = CORE_IOT_SERVER;
	doc["CORE_IOT_PORT"]   = CORE_IOT_PORT;

	File configFile = LittleFS.open("/info.dat", "w");

	if (configFile) {
		serializeJson(doc, configFile);
		configFile.close();
	}
	else {
		Serial.println("Unable to save the configuration.");
	}

	ESP.restart();
};

bool check_info_File(bool check) {
	if (!check) {
		if (!LittleFS.begin(true)) {
			Serial.println("❌ Lỗi khởi động LittleFS!");
			return false;
		}

		Load_info_File();
	}

	if ((WIFI_SSID.isEmpty() && WIFI_PASS.isEmpty()) ||
		(!WIFI_SSID.isEmpty() && WiFi.status() != WL_CONNECTED && is_first_time))
	{
		// Update flag
		is_first_time = false;

		if (!check) {
			// webserver_isrunning = false;
			startAP();
		}

		return false;
	}

	return true;
}