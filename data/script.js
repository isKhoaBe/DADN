// ==================== 1. KHAI BÁO BIẾN CHUNG ====================
var gateway = `ws://${window.location.hostname}/ws`;
var websocket;

// Mảng lưu dữ liệu lịch sử cho biểu đồ (tối đa 20 điểm)
var maxDataPoints = 20;
var tempData = new Array(maxDataPoints).fill(0);
var humiData = new Array(maxDataPoints).fill(0);

// Danh sách thiết bị
let relayList = [];
let deleteTarget = null;

// ==================== 2. KHỞI TẠO KHI TRANG LOAD ====================
window.addEventListener("load", function () {
	initWebSocket();
	drawCustomChart("tempChart", tempData, "#ff5d8a");
	drawCustomChart("humiChart", humiData, "#4db7ff");

	const savedRelays = localStorage.getItem("myRelays");
	if (savedRelays) {
		relayList = JSON.parse(savedRelays);
		renderRelays();
	}

	const themeToggle = document.getElementById("themeToggle");
	if (themeToggle) {
		themeToggle.addEventListener("change", function () {
			if (this.checked) 
				document.body.classList.add("light");
			else 
				document.body.classList.remove("light");
		});
	}

	document.querySelectorAll(".menu-item").forEach((item) => {
		item.addEventListener("click", function (e) {
			const sectionId = this.getAttribute("data-section");
			if (sectionId) 
				showSection(sectionId, e);
		});
	});

	const homeSection = document.getElementById("home");
	if (homeSection) 
		homeSection.style.display = "block";
});

// ==================== 3. WEBSOCKET LOGIC ====================
function initWebSocket() {
	console.log("Opening WebSocket...");
	websocket = new WebSocket(gateway);
	websocket.onopen = onOpen;
	websocket.onclose = onClose;
	websocket.onmessage = onMessage;
}

function onOpen(event) {
	console.log("Connected");
	Send_Data(JSON.stringify({ page: "info", action: "get_sys_info" }));
}

function onClose(event) {
	console.log("Closed");
	setTimeout(initWebSocket, 2000);
}

function onMessage(event) {
	try {
		var msg = JSON.parse(event.data);

		// Cập nhật Thông tin cấu hình
		if (
			msg.type === "SYS_INFO" ||
			msg.WIFI_SSID !== undefined ||
			msg.WIFI_PASS !== undefined ||
			msg.CORE_IOT_TOKEN !== undefined ||
			msg.CORE_IOT_SERVER !== undefined ||
			msg.CORE_IOT_PORT !== undefined
		) {
			// Tránh lỗi nếu ID không tồn tại
			const setText = (id, val) => {
				const el = document.getElementById(id);
				if (el) 
					el.innerText = val ? val : " -- ";
			};

			setText("info-ssid", msg.WIFI_SSID);
			setText("info-pass", msg.WIFI_PASS);
			setText("info-token", msg.CORE_IOT_TOKEN);
			setText("info-server", msg.CORE_IOT_SERVER);
			setText("info-port", msg.CORE_IOT_PORT);
		}

		// Cập nhật Nhiệt độ
		if (msg.temp !== undefined) {
			const tempEl = document.getElementById("tempValue");
			if (tempEl) 
				tempEl.innerText = parseFloat(msg.temp).toFixed(2) + " °C";
			tempData.push(msg.temp);
			if (tempData.length > maxDataPoints) 
				tempData.shift();
			drawCustomChart("tempChart", tempData, "#ff5d8a");
		}

		// Cập nhật Độ ẩm
		if (msg.humi !== undefined) {
			const humiEl = document.getElementById("humiValue");
			if (humiEl) 
				humiEl.innerText = parseFloat(msg.humi).toFixed(2) + " %";
			humiData.push(msg.humi);
			if (humiData.length > maxDataPoints) 
				humiData.shift();
			drawCustomChart("humiChart", humiData, "#4db7ff");
		}

		// Cập nhật trạng thái Relay từ ESP32
		if (msg.gpio !== undefined && msg.status !== undefined) {
			const relay = relayList.find((r) => r.gpio == msg.gpio);
			if (relay) {
				relay.state = msg.status === "ON";
				renderRelays();
			}
		}

		// // Cập nhật Thông tin hệ thống
		// if (msg.ssid !== undefined) {
		//     if(document.getElementById("info-ssid"))
		//         document.getElementById("info-ssid").innerText = msg.ssid;
		//     if(document.getElementById("info-ip"))
		//         document.getElementById("info-ip").innerText = msg.ip;
		//     if(msg.pass !== undefined && document.getElementById("info-pass")) {
		//         document.getElementById("info-pass").innerText = msg.pass;
		//     }
		// }
	} catch (e) {
		console.warn("Lỗi dữ liệu:", e);
	}
}

function Send_Data(data) {
	if (websocket && websocket.readyState === WebSocket.OPEN) {
		websocket.send(data);
		console.log("Gửi", data);
	} else {
		console.log("WebSocket chưa kết nối");
	}
}

// ==================== 4. HÀM ĐIỀU HƯỚNG TAB ====================
function showSection(id, event) {
	document.querySelectorAll(".section").forEach((sec) => {
		sec.style.display = "none";
		sec.classList.add("hidden");
	});
	const target = document.getElementById(id);
	if (target) {
		target.classList.remove("hidden");
		target.style.display = id === "settings" ? "flex" : "block";
	}
	document.querySelectorAll(".menu-item").forEach((i) => i.classList.remove("active"));
	if (event && event.currentTarget) 
		event.currentTarget.classList.add("active");
}

// ==================== 5. HÀM VẼ BIỂU ĐỒ ====================
function drawCustomChart(canvasId, data, color) {
	const canvas = document.getElementById(canvasId);
	if (!canvas) 
		return;

	const parentWidth = canvas.parentElement.clientWidth;
	canvas.width = parentWidth - 40;
	canvas.height = 350;

	const ctx = canvas.getContext("2d");
	const w = canvas.width;
	const h = canvas.height;
	const padLeft = 40;
	const padRight = 10;
	const padTop = 20;
	const padBottom = 30;
	const graphW = w - padLeft - padRight;
	const graphH = h - padTop - padBottom;

	ctx.clearRect(0, 0, w, h);

	const steps = 10;
	ctx.font = "12px sans-serif";
	ctx.textAlign = "right";
	ctx.textBaseline = "middle";

	for (let i = 0; i <= steps; i++) {
		const value = i * 10;
		const y = padTop + graphH - (value / 100) * graphH;
		ctx.beginPath();
		if (value === 0) {
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1;
		} else {
			ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
			ctx.lineWidth = 1;
		}
		ctx.moveTo(padLeft, y);
		ctx.lineTo(w - padRight, y);
		ctx.stroke();
		ctx.fillStyle = "#8c8f9d";
		ctx.fillText(value, padLeft - 10, y);
	}

	if (data.length === 0) 
		return;

	const getX = (index) => padLeft + (index / (data.length - 1)) * graphW;
	const getY = (val) => {
		let clampedVal = Math.max(0, Math.min(100, val));
		return padTop + graphH - (clampedVal / 100) * graphH;
	};

	ctx.beginPath();
	ctx.lineWidth = 3;
	ctx.strokeStyle = color;
	ctx.moveTo(getX(0), getY(data[0]));
	for (let i = 1; i < data.length; i++) 
		ctx.lineTo(getX(i), getY(data[i]));
	ctx.stroke();

	ctx.lineTo(getX(data.length - 1), padTop + graphH);
	ctx.lineTo(getX(0), padTop + graphH);
	ctx.closePath();
	const gradient = ctx.createLinearGradient(0, 0, 0, h);
	gradient.addColorStop(0, color);
	gradient.addColorStop(1, "rgba(0,0,0,0)");
	ctx.globalAlpha = 0.2;
	ctx.fillStyle = gradient;
	ctx.fill();
	ctx.globalAlpha = 1.0;

	const lastIndex = data.length - 1;
	const lastX = getX(lastIndex);
	const lastY = getY(data[lastIndex]);
	ctx.beginPath();
	ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
	ctx.fillStyle = "#fff";
	ctx.fill();
	ctx.stroke();
}

// ==================== 6. QUẢN LÝ THIẾT BỊ ====================
// Nút LED tích hợp (LED 1, LED 2)
function toggleDevice(btnId) {
	const btn = document.getElementById(btnId);
	let isActive = btn.classList.contains("active");

	if (isActive) {
		btn.classList.remove("active");
		btn.innerText = "OFF";
		isActive = false;
	} else {
		btn.classList.add("active");
		btn.innerText = "ON";
		isActive = true;
	}

	Send_Data(
		JSON.stringify({
			action: "control_static",
			id: btnId,
			status: isActive ? "ON" : "OFF",
		})
	);
}

function addNewDevice() {
	const modal = document.getElementById("addDeviceModal");
	if (modal) {
		modal.classList.remove("hidden");
		modal.style.display = "flex";
		document.getElementById("newDevName").value = "";
		document.getElementById("newDevGPIO").value = "";
	}
}
function closeModal() {
	const modal = document.getElementById("addDeviceModal");
	if (modal) {
		modal.classList.add("hidden");
		modal.style.display = "none";
	}
}
function confirmAddDevice() {
	const name = document.getElementById("newDevName").value.trim();
	const gpio = document.getElementById("newDevGPIO").value.trim();
	if (!name || !gpio) {
		alert("⚠️ Nhập đủ thông tin!");
		return;
	}

	relayList.push({ id: Date.now(), name, gpio, state: false });
	localStorage.setItem("myRelays", JSON.stringify(relayList));
	renderRelays();
	closeModal();
}
function renderRelays() {
	const container = document.getElementById("relay-list");
	if (!container) 
		return;
	container.innerHTML = "";
	relayList.forEach((r) => {
		const card = document.createElement("div");
		card.className = `card device-card ${r.state ? "blue" : "red"}`;
		card.innerHTML = `
            <button class="btn-delete" onclick="deleteRelay(${r.id})">✕</button>
            <div class="device-info">
                <div class="card-header" style="margin-bottom: 5px;">🔌 ${r.name}</div>
                <div class="gpio-badge">GPIO: ${r.gpio}</div>
            </div>
            <button class="toggle-btn ${r.state ? "active" : ""}" onclick="toggleRelay(${r.id})">
                ${r.state ? "ON" : "OFF"}
            </button>
        `;
		container.appendChild(card);
	});
}

// --- HÀM NÀY ĐÃ ĐƯỢC SỬA CHO KHỚP VỚI C++ ---
function toggleRelay(id) {
	const relay = relayList.find((r) => r.id === id);
	if (relay) {
		relay.state = !relay.state;

		// Cập nhật lại cấu trúc gửi đi cho đúng với task_handler.cpp
		// C++ đợi: { page: "device", value: { gpio: ..., status: ... } }
		const relayJSON = JSON.stringify({
			page: "device",
			value: {
				gpio: parseInt(relay.gpio),
				status: relay.state ? "ON" : "OFF",
			},
		});
		Send_Data(relayJSON);

		renderRelays();
		localStorage.setItem("myRelays", JSON.stringify(relayList));
	}
}

function deleteRelay(id) {
	if (confirm("Bạn có chắc muốn xóa thiết bị này không?")) {
		relayList = relayList.filter((r) => r.id !== id);
		localStorage.setItem("myRelays", JSON.stringify(relayList));
		renderRelays();
	}
}

// ==================== 7. FORM CÀI ĐẶT ====================
const settingsForm = document.getElementById("settingsForm");
if (settingsForm) {
	settingsForm.addEventListener("submit", function (e) {
		e.preventDefault();
		const ssidInput = document.getElementById("cfg_ssid");
		const passInput = document.getElementById("cfg_pass");
		const tokenInput = document.getElementById("cfg_token");
		const serverInput = document.getElementById("cfg_server");
		const portInput = document.getElementById("cfg_port"); // Tên biến đã đúng

		if (!ssidInput || !passInput || !tokenInput || !serverInput || !portInput) {
			alert("Lỗi: Không tìm thấy ô nhập liệu");
			return;
		}

		const settingsJSON = JSON.stringify({
			page: "setting",
			value: {
				ssid: ssidInput.value.trim(),
				password: passInput.value.trim(),
				token: tokenInput.value.trim(),
				server: serverInput.value.trim(),
				port: portInput.value.trim(),
			},
		});

		Send_Data(settingsJSON);
		console.log("Đã gửi cấu hình:", settingsJSON);
		alert("✅ Đã gửi cấu hình! Thiết bị sẽ khởi động lại.");
	});
}
