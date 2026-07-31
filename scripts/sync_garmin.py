import json
import os
from datetime import date, timedelta

from garminconnect import Garmin

ROOT = os.path.join(os.path.dirname(__file__), "..")
DATA_PATH = os.path.join(ROOT, "data", "workouts.json")

TYPE_LABELS = {
    "strength_training": "重量訓練",
    "running": "跑步",
    "walking": "走路",
    "cycling": "騎車",
    "indoor_cardio": "室內有氧",
}


def load():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save(data):
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    client = Garmin(os.environ["GARMIN_EMAIL"], os.environ["GARMIN_PASSWORD"])
    client.login()

    existing = load()
    existing_ids = {w["id"] for w in existing}

    # look back a few days in case an activity synced to Garmin Connect late
    start = date.today() - timedelta(days=3)
    activities = client.get_activities_by_date(start.isoformat(), date.today().isoformat())

    added = 0
    for act in activities:
        act_id = f"garmin-{act['activityId']}"
        if act_id in existing_ids:
            continue
        activity_type = act.get("activityType", {}).get("typeKey", "")
        existing.append({
            "id": act_id,
            "date": act["startTimeLocal"][:10],
            "type": activity_type,
            "typeLabel": TYPE_LABELS.get(activity_type, activity_type or "運動"),
            "durationMin": round((act.get("duration") or 0) / 60),
            "calories": round(act.get("calories") or 0),
            "avgHr": round(act["averageHR"]) if act.get("averageHR") else None,
            "distanceKm": round(act["distance"] / 1000, 2) if act.get("distance") else None,
            "source": "garmin",
        })
        existing_ids.add(act_id)
        added += 1

    if added:
        existing.sort(key=lambda w: w["date"])
        save(existing)
        print(f"Added {added} new activities")
    else:
        print("No new activities")


if __name__ == "__main__":
    main()
