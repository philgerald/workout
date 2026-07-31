import base64
import glob
import json
import os
import shutil
from datetime import datetime

import anthropic

ROOT = os.path.join(os.path.dirname(__file__), "..")
INBOX = os.path.join(ROOT, "meals", "inbox")
PHOTOS = os.path.join(ROOT, "meals", "photos")
DATA_PATH = os.path.join(ROOT, "data", "meals.json")

MEDIA_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}

PROMPT = (
    "這是一張食物照片，請估算內容並只回傳純 JSON（不要任何多餘文字或 markdown），"
    '格式為 {"description": "...", "calories": 數字, "protein": 數字, "carbs": 數字, "fat": 數字}，'
    "description 用繁體中文簡短描述吃了什麼，calories 單位 kcal，其餘單位為公克，是概估值即可。"
)


def load():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save(data):
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def estimate(client, path):
    ext = path.lower().rsplit(".", 1)[-1]
    with open(path, "rb") as f:
        img_b64 = base64.standard_b64encode(f.read()).decode()
    msg = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=400,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": MEDIA_TYPES.get(ext, "image/jpeg"), "data": img_b64}},
                {"type": "text", "text": PROMPT},
            ],
        }],
    )
    text = msg.content[0].text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text.split("\n", 1)[1] if "\n" in text else text
    return json.loads(text)


def main():
    os.makedirs(PHOTOS, exist_ok=True)
    files = sorted(f for f in glob.glob(os.path.join(INBOX, "*")) if not f.endswith(".gitkeep"))
    if not files:
        print("No new photos")
        return

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    data = load()

    for path in files:
        fname = os.path.basename(path)
        now = datetime.now()
        try:
            result = estimate(client, path)
        except Exception as e:
            print(f"Failed to estimate {fname}: {e}")
            continue

        dest_name = f"{now.strftime('%Y%m%d-%H%M%S')}-{fname}"
        shutil.move(path, os.path.join(PHOTOS, dest_name))

        data.append({
            "id": f"meal-{now.strftime('%Y%m%d-%H%M%S')}",
            "date": now.strftime("%Y-%m-%d"),
            "time": now.strftime("%H:%M"),
            "photo": f"meals/photos/{dest_name}",
            "description": result.get("description", ""),
            "calories": result.get("calories", 0),
            "protein": result.get("protein", 0),
            "carbs": result.get("carbs", 0),
            "fat": result.get("fat", 0),
            "source": "ai-estimate",
        })
        print(f"Processed {fname}")

    save(data)


if __name__ == "__main__":
    main()
