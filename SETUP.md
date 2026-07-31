# 自動記錄設定

網頁現在會讀 `data/workouts.json`（Garmin 訓練）和 `data/meals.json`（飲食）並顯示在「今日進度」「訓練紀錄」「飲食紀錄」三個區塊。這兩個檔案由下面兩個 GitHub Actions 自動更新，需要先在 repo 設定 Secrets 才會動。

設定路徑：repo → **Settings → Secrets and variables → Actions → New repository secret**

## 1. 訓練紀錄（Garmin 自動同步）

用 `.github/workflows/garmin-sync.yml`，每天 07:00（台灣時間）自動抓取 Garmin Connect 的活動寫入 `data/workouts.json`。

需要新增這兩個 Secret：
- `GARMIN_EMAIL` — Garmin 帳號 email
- `GARMIN_PASSWORD` — Garmin 帳號密碼

**注意**：這是透過非官方套件 `garminconnect` 模擬登入，不是 Garmin 官方 API：
- 如果 Garmin 帳號有開**兩步驟驗證（2FA）**，自動登入會失敗，需要先關閉 2FA，或改用手動匯出的方式。
- Garmin 網站改版時這個套件可能會暫時失效，需要等套件更新。
- 想手動測試，可以到 repo 的 **Actions → Garmin Sync → Run workflow** 手動觸發一次，不用等排程。

## 2. 飲食紀錄（拍照 + AI 估算）

用 `.github/workflows/meal-photo.yml`，只要有新照片被推進 `meals/inbox/` 資料夾，就會自動用 Claude 估算食物內容和 macros，寫入 `data/meals.json`，照片搬到 `meals/photos/`。

需要新增這個 Secret：
- `ANTHROPIC_API_KEY` — 你的 Anthropic API key（[console.anthropic.com](https://console.anthropic.com) 申請，用量計費）

### 怎麼把照片丟進 inbox

最簡單的方式是用手機的 GitHub app，或直接用瀏覽器：
1. 打開 repo 的 `meals/inbox/` 資料夾
2. 點 **Add file → Upload files**，把剛拍的食物照片上傳、Commit
3. 幾十秒後 Action 就會跑完，AI 估算結果會出現在 `data/meals.json`，網頁重新整理就看得到

之後想更方便，也可以裝 GitHub 的手機 App，直接對著 repo 資料夾用「上傳檔案」，等於一個簡易的拍照上傳流程。

## 本機測試注意事項

`index.html` 用 `fetch()` 讀 JSON 檔，直接用瀏覽器打開本機檔案（`file://`）會因為瀏覽器安全限制讀不到，需要跑一個本機伺服器測試，例如在專案資料夾執行：

```
python -m http.server 8000
```

再用瀏覽器打開 `http://localhost:8000`。部署到 GitHub Pages 後就沒有這個問題，正常用網址打開即可。
