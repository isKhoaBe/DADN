import os
import pickle
import face_recognition
import numpy as np
from PIL import Image
from pathlib import Path

KNOWN_FACES_DIR = "known_faces"
CACHE_FILE      = "face_encodings.pkl"
SUPPORTED_EXTS  = {".jpg", ".jpeg", ".png"}


def load_face_database(force_rebuild: bool = False) -> tuple[list, list]:
    if not force_rebuild and os.path.exists(CACHE_FILE):
        print("[DB] Loading from cache...")
        with open(CACHE_FILE, "rb") as f:
            data = pickle.load(f)
        print(f"[DB] {len(data['names'])} encodings loaded: {set(data['names'])}")
        return data["encodings"], data["names"]

    print("[DB] Building database from images...")
    known_encodings, known_names = [], []
    base = Path(KNOWN_FACES_DIR)

    if not base.exists():
        print(f"[DB] ERROR: '{KNOWN_FACES_DIR}' folder not found.")
        return [], []

    for person_dir in sorted(p for p in base.iterdir() if p.is_dir()):
        name   = person_dir.name
        images = [f for f in person_dir.iterdir() if f.suffix.lower() in SUPPORTED_EXTS]
        count  = 0

        for img_path in images:
            try:
                # Strictly enforce 8-bit RGB conversion using PIL and Numpy
                pil_img = Image.open(str(img_path)).convert("RGB")
                img_array = np.array(pil_img, dtype=np.uint8)
                
                # dlib sometimes fails if the memory layout is not contiguous
                img_array = np.ascontiguousarray(img_array)
            except Exception as e:
                print(f"[DB] ERROR: Cannot read {img_path.name} - {e}")
                continue
                
            encs  = face_recognition.face_encodings(img_array)
            if not encs:
                print(f"[DB] No face found in {img_path.name}, skipping.")
                continue
            known_encodings.append(encs[0])
            known_names.append(name)
            count += 1

        print(f"[DB] '{name}': {count}/{len(images)} images encoded.")

    if not known_encodings:
        print("[DB] ERROR: No encodings built.")
        return [], []

    # Save cache for faster startup next time
    with open(CACHE_FILE, "wb") as f:
        pickle.dump({"encodings": known_encodings, "names": known_names}, f)
    print(f"[DB] Cache saved. {len(set(known_names))} owner(s) registered.")

    return known_encodings, known_names


def clear_cache():
    """Call this after adding or removing owners to force a rebuild."""
    if os.path.exists(CACHE_FILE):
        os.remove(CACHE_FILE)
        print("[DB] Cache cleared.")