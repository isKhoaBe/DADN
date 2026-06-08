import cv2
import face_recognition
import numpy as np
import math
import time
import datetime
import serial
import serial.tools.list_ports

from face_database import load_face_database

# --- Config ---
TOLERANCE     = 0.50
SCALE         = 0.25
RECHECK_EVERY = 30
CAMERA_ID     = 0
BAUD_RATE     = 115200
SERIAL_PORT   = "COM4"

COLOR_GREEN = (0, 255, 120)
COLOR_RED   = (50, 50, 255)
COLOR_WHITE = (230, 230, 230)
COLOR_GRAY  = (140, 140, 140)

# --- Load face database ---
print("[INFO] Starting face recognition module...")
known_encodings, known_names = load_face_database()

if not known_encodings:
    print("[INFO] No face data found. Exiting.")
    exit()

print(f"[INFO] {len(set(known_names))} owner(s) loaded. Starting camera...")

# --- Camera setup ---
cap = cv2.VideoCapture(CAMERA_ID)
if not cap.isOpened():
    print(f"[ERROR] Cannot open camera {CAMERA_ID}.")
    exit()

cap.set(cv2.CAP_PROP_FRAME_WIDTH,  1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

# --- Serial setup ---
def connect_serial():
    port = SERIAL_PORT
    if port is None:
        # Auto-detect first available port
        ports = serial.tools.list_ports.comports()
        if ports:
            port = ports[0].device
            print(f"[SERIAL] Auto-detected port: {port}")
        else:
            print("[SERIAL] No COM port found. Running without serial.")
            return None
    try:
        ser = serial.Serial(port, BAUD_RATE, timeout=1)
        print(f"[SERIAL] Connected: {port} @ {BAUD_RATE}")
        return ser
    except Exception as e:
        print(f"[SERIAL] Failed to connect: {e}")
        return None

ser = connect_serial()


def send_signal(is_known: bool):
    """Send 'yes' or 'no' to ESP32 via Serial."""
    if ser and ser.is_open:
        msg = "yes\n" if is_known else "no\n"
        ser.write(msg.encode())


# --- State ---
face_states      = []
last_signal_name = None   # Track last sent signal to avoid spamming
frame_count      = 0
fps              = 0
fps_timer        = time.time()
fps_frame_count  = 0


# --- HUD drawing ---
def draw_top_bar(img, face_count, known_count):
    h, w = img.shape[:2]
    overlay = img.copy()
    cv2.rectangle(overlay, (0, 0), (w, 36), (5, 15, 5), cv2.FILLED)
    cv2.addWeighted(overlay, 0.85, img, 0.15, 0, img)
    cv2.line(img, (0, 36), (w, 36), (30, 60, 30), 1)

    font    = cv2.FONT_HERSHEY_SIMPLEX
    now_str = datetime.datetime.now().strftime("%Y-%m-%d  %H:%M:%S")

    cv2.putText(img, "SMART HOME  —  FRONT DOOR", (14, 23),
                font, 0.45, COLOR_GREEN, 1, cv2.LINE_AA)
    cv2.putText(img, f"FPS: {fps:.0f}", (w - 340, 23),
                font, 0.40, (0, 200, 80), 1, cv2.LINE_AA)
    cv2.putText(img, now_str, (w - 260, 23),
                font, 0.40, (0, 200, 80), 1, cv2.LINE_AA)

    # Blinking REC indicator
    if int(time.time() * 2) % 2 == 0:
        cv2.circle(img, (w - 14, 18), 5, (0, 0, 220), cv2.FILLED)


def draw_bottom_bar(img, face_count, known_count):
    h, w = img.shape[:2]
    overlay = img.copy()
    cv2.rectangle(overlay, (0, h - 28), (w, h), (5, 15, 5), cv2.FILLED)
    cv2.addWeighted(overlay, 0.85, img, 0.15, 0, img)
    cv2.line(img, (0, h - 28), (w, h - 28), (30, 60, 30), 1)

    font           = cv2.FONT_HERSHEY_SIMPLEX
    stranger_count = face_count - known_count

    cv2.putText(img, f"FACES: {face_count}", (14, h - 10),
                font, 0.38, COLOR_GRAY, 1, cv2.LINE_AA)
    cv2.putText(img, f"KNOWN: {known_count}", (140, h - 10),
                font, 0.38, COLOR_GREEN, 1, cv2.LINE_AA)

    if stranger_count > 0:
        cv2.putText(img, f"STRANGER: {stranger_count}", (260, h - 10),
                    font, 0.38, COLOR_RED, 1, cv2.LINE_AA)

    cv2.putText(img, "MODULE 5 — FACE RECOGNITION", (w - 270, h - 10),
                font, 0.35, (50, 100, 50), 1, cv2.LINE_AA)


def draw_face_box(img, x, y, w, h, name, distance):
    is_known   = name != "Stranger"
    main_color = COLOR_GREEN if is_known else COLOR_RED
    bg_color   = (5, 35, 8) if is_known else (35, 5, 5)
    confidence = max(0, round((1 - distance) * 100))
    img_h, img_w = img.shape[:2]

    # Info panel
    panel_w, panel_h = 175, 115
    px = x + w + 8
    py = y
    if px + panel_w > img_w:
        px = x - panel_w - 8
    if py + panel_h > img_h:
        py = img_h - panel_h

    if px >= 0:
        overlay = img.copy()
        cv2.rectangle(overlay, (px, py), (px + panel_w, py + panel_h), bg_color, cv2.FILLED)
        cv2.addWeighted(overlay, 0.80, img, 0.20, 0, img)
        cv2.rectangle(img, (px, py), (px + panel_w, py + panel_h),
                      tuple(c // 3 for c in main_color), 1)

        font = cv2.FONT_HERSHEY_SIMPLEX
        tx   = px + 10

        status = "AUTH: GRANTED" if is_known else "AUTH:  DENIED"
        cv2.putText(img, status, (tx, py + 18), font, 0.38, main_color, 1, cv2.LINE_AA)
        cv2.line(img, (px + 6, py + 24), (px + panel_w - 6, py + 24),
                 tuple(c // 4 for c in main_color), 1)

        if is_known:
            cv2.putText(img, "USER", (tx, py + 40),
                        font, 0.30, tuple(c // 2 for c in main_color), 1, cv2.LINE_AA)
            cv2.putText(img, name, (tx, py + 55),
                        font, 0.40, COLOR_WHITE, 1, cv2.LINE_AA)
            cv2.putText(img, "CONFIDENCE", (tx, py + 73),
                        font, 0.30, tuple(c // 2 for c in main_color), 1, cv2.LINE_AA)

            # Confidence bar
            bar_x, bar_y  = tx, py + 80
            bar_total_w   = panel_w - 20
            bar_fill_w    = int(bar_total_w * confidence / 100)
            cv2.rectangle(img, (bar_x, bar_y), (bar_x + bar_total_w, bar_y + 6),
                          (20, 40, 20), cv2.FILLED)
            if bar_fill_w > 0:
                cv2.rectangle(img, (bar_x, bar_y), (bar_x + bar_fill_w, bar_y + 6),
                              main_color, cv2.FILLED)
            cv2.putText(img, f"{confidence}%", (tx, py + 103),
                        font, 0.36, main_color, 1, cv2.LINE_AA)
        else:
            cv2.putText(img, "STATUS",   (tx, py + 42), font, 0.30, (100, 50, 50), 1, cv2.LINE_AA)
            cv2.putText(img, "STRANGER", (tx, py + 57), font, 0.40, COLOR_RED,     1, cv2.LINE_AA)
            cv2.putText(img, "ACTION",   (tx, py + 75), font, 0.30, (100, 50, 50), 1, cv2.LINE_AA)
            cv2.putText(img, "LOCKDOWN", (tx, py + 90), font, 0.40, COLOR_GRAY,    1, cv2.LINE_AA)
            cv2.putText(img, "! ALERT LOGGED", (tx, py + 110), font, 0.30,
                        (80, 80, 200), 1, cv2.LINE_AA)

    # Corner brackets
    length, thick = max(12, int(min(w, h) * 0.15)), 2
    corners = [
        ((x,     y    ), (x + length, y    ), (x,     y + length)),
        ((x + w, y    ), (x + w - length, y), (x + w, y + length)),
        ((x,     y + h), (x + length, y + h), (x,     y + h - length)),
        ((x + w, y + h), (x + w - length, y + h), (x + w, y + h - length)),
    ]
    for c in corners:
        cv2.line(img, c[0], c[1], main_color, thick, cv2.LINE_AA)
        cv2.line(img, c[0], c[2], main_color, thick, cv2.LINE_AA)
    cv2.rectangle(img, (x, y), (x + w, y + h), tuple(c // 4 for c in main_color), 1)

    # Crosshair
    cx, cy = x + w // 2, y + h // 2
    cv2.line(img, (cx - 10, cy), (cx + 10, cy), main_color, 1, cv2.LINE_AA)
    cv2.line(img, (cx, cy - 10), (cx, cy + 10), main_color, 1, cv2.LINE_AA)
    cv2.circle(img, (cx, cy), 3, main_color, 1, cv2.LINE_AA)

    # Animated scan line
    scan_y = int(y + (math.sin(time.time() * 4) + 1) / 2 * h)
    scan_y = max(y, min(scan_y, y + h))
    cv2.line(img, (x, scan_y), (x + w, scan_y), main_color, 1)


# --- Detection and tracking ---
def detect_faces(frame):
    small = cv2.resize(frame, (0, 0), fx=SCALE, fy=SCALE)
    rgb   = np.ascontiguousarray(small[:, :, ::-1])

    locations = face_recognition.face_locations(rgb, model="hog")
    if not locations:
        return []

    encodings = face_recognition.face_encodings(rgb, locations)
    results   = []

    for (top, right, bottom, left), enc in zip(locations, encodings):
        inv = int(1 / SCALE)
        top, right, bottom, left = top * inv, right * inv, bottom * inv, left * inv

        distances = face_recognition.face_distance(known_encodings, enc)
        best_idx  = int(np.argmin(distances))
        best_dist = float(distances[best_idx])
        name      = known_names[best_idx] if best_dist <= TOLERANCE else "Stranger"

        results.append({
            "bbox":           (left, top, right - left, bottom - top),
            "name":           name,
            "distance":       best_dist,
            "frames_tracked": 0,
            "tracker":        None,
        })

    return results


def init_trackers(frame, states):
    for state in states:
        tracker = cv2.TrackerKCF_create()
        tracker.init(frame, state["bbox"])
        state["tracker"] = tracker
    return states


# --- Main loop ---
print("[INFO] Press Q to quit.\n")

while True:
    ret, frame = cap.read()
    if not ret:
        print("[ERROR] Cannot read frame.")
        break

    frame_count     += 1
    fps_frame_count += 1

    elapsed = time.time() - fps_timer
    if elapsed >= 1.0:
        fps             = fps_frame_count / elapsed
        fps_timer       = time.time()
        fps_frame_count = 0

    # Run AI detection periodically, use tracker in between
    if frame_count % RECHECK_EVERY == 1 or not face_states:
        face_states = detect_faces(frame)
        if face_states:
            face_states = init_trackers(frame, face_states)
    else:
        alive = []
        for state in face_states:
            if state["tracker"] is None:
                continue
            ok, bbox = state["tracker"].update(frame)
            if ok:
                fh, fw = frame.shape[:2]
                x, y, w, h = [int(v) for v in bbox]
                x, y = max(0, x), max(0, y)
                w, h = min(w, fw - x), min(h, fh - y)
                state["bbox"]           = (x, y, w, h)
                state["frames_tracked"] += 1
                alive.append(state)
        face_states = alive

    # Send signal to ESP32 when detection result changes
    if face_states:
        current_name = face_states[0]["name"]
        if current_name != last_signal_name:
            send_signal(current_name != "Stranger")
            last_signal_name = current_name
    else:
        if last_signal_name is not None:
            send_signal(False)
            last_signal_name = None

    # Draw HUD
    known_count = sum(1 for s in face_states if s["name"] != "Stranger")
    draw_top_bar(frame, len(face_states), known_count)
    draw_bottom_bar(frame, len(face_states), known_count)

    for state in face_states:
        x, y, w, h = state["bbox"]
        draw_face_box(frame, x, y, w, h, state["name"], state["distance"])

    cv2.imshow("Smart Home — Face Recognition", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

print("[INFO] Shutting down.")
cap.release()
cv2.destroyAllWindows()
if ser and ser.is_open:
    ser.close()