"""
Simple settings store for test window (start/end time).
Stored as a JSON file so it persists across restarts.
"""
import json
import os

SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "test_settings.json")

DEFAULT_SETTINGS = {
    "test_start": "2026-06-22T16:20:00+05:30",
    "test_end": "2026-06-22T17:20:00+05:30",
}


def get_settings():
    if not os.path.exists(SETTINGS_FILE):
        save_settings(DEFAULT_SETTINGS)
    with open(SETTINGS_FILE, "r") as f:
        return json.load(f)


def save_settings(data):
    with open(SETTINGS_FILE, "w") as f:
        json.dump(data, f)
