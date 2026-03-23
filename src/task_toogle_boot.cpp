#include "task_toogle_boot.h"

// Trạng thái hiện tại: đang ở AP hay STA
static bool s_isInAPMode = false;

void setup_toogle_boot() {
	pinMode(BOOT_PIN, INPUT_PULLUP);
	Serial.println("[INIT] Boot Button Monitor: \n\t - Short press = toggle AP/STA \n\t - Hold " +
				   String(int(LONG_PRESS_MS / 1000)) + "s = Factory Reset");
}

void Task_Toogle_BOOT(void *pvParameters) {
	setup_toogle_boot();

	bool		  buttonWasDown	   = false; // trạng thái nút ở vòng lặp trước
	bool		  longPressHandled = false; // đã xử lý long press chưa
	unsigned long pressStartTime   = 0;

	while (true) {
		bool		  buttonDown = (digitalRead(BOOT_PIN) == LOW);
		unsigned long now		 = millis();

		// 1. Vừa mới bắt đầu nhấn nút
		if (buttonDown && !buttonWasDown) {
			pressStartTime	 = now;
			longPressHandled = false;
			// Serial.println("🔘 Button pressed...");
		}

		// 2. Đang giữ nút: kiểm tra long press
		if (buttonDown && buttonWasDown && !longPressHandled) {
			if (now - pressStartTime >= LONG_PRESS_MS) {
				longPressHandled = true;
				Serial.println("\n⚠️ Long press >= 3s -> FACTORY RESET");

				// Hành động factory reset
				Delete_info_File();
				vTaskDelay(200 / portTICK_PERIOD_MS); // cho chắc file system flush

				// Nếu bạn chỉ muốn xóa file + kill task thì:
				vTaskDelete(NULL);
				// ESP.restart();
			}
		}

		if (!buttonDown && buttonWasDown) {
			unsigned long pressDuration = now - pressStartTime;

			if (!longPressHandled && pressDuration >= DEBOUNCE_MS &&
				pressDuration < LONG_PRESS_MS) {
				Serial.println("✅ Short press -> toggle AP/STA");

				if (!s_isInAPMode) {
					// Đang ở STA -> chuyển sang AP
					s_isInAPMode = true;
					// webserver_isrunning = false;
					startAP();
				}
				else {
					// Đang ở AP -> chuyển về STA
					s_isInAPMode = false;

					// startSTA();
					ESP.restart();
				}
			}
		}

		buttonWasDown = buttonDown;
		vTaskDelay(50 / portTICK_PERIOD_MS);
	}
}
