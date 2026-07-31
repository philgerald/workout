# 資料格式

## workouts.json

由 `.github/workflows/garmin-sync.yml` 每天自動從 Garmin Connect 同步寫入，也可以手動編輯。

```json
[
  {
    "id": "garmin-123456789",
    "date": "2026-07-31",
    "type": "strength_training",
    "typeLabel": "重量訓練",
    "durationMin": 48,
    "calories": 320,
    "avgHr": 118,
    "distanceKm": null,
    "source": "garmin"
  }
]
```

## meals.json

由 `.github/workflows/meal-photo.yml` 在 `meals/inbox/` 有新照片時自動用 AI 估算並寫入，也可以手動編輯。

```json
[
  {
    "id": "meal-20260731-0700",
    "date": "2026-07-31",
    "time": "07:00",
    "photo": "meals/photos/20260731-0700.jpg",
    "description": "水煮蛋 2 顆、全麥吐司 2 片、乳清豆漿",
    "calories": 500,
    "protein": 35,
    "carbs": 55,
    "fat": 15,
    "source": "ai-estimate"
  }
]
```

macros 單位皆為公克 (g)，calories 為 kcal。`source` 標記資料是 `garmin`、`ai-estimate` 還是 `manual`（手動輸入），方便之後校正。
