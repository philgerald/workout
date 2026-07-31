# 自動記錄設定

網頁會讀 `data/workouts.json`（Garmin 訓練）和 `data/meals.json`（飲食）並顯示在「今日進度」「訓練紀錄」「飲食紀錄」三個區塊。

## 1. 訓練紀錄（Garmin 自動同步）

用 `.github/workflows/garmin-sync.yml`，每天 07:00（台灣時間）自動抓取 Garmin Connect 的活動寫入 `data/workouts.json`。

設定路徑：repo → **Settings → Secrets and variables → Actions → New repository secret**，新增：
- `GARMIN_EMAIL` — Garmin 帳號 email
- `GARMIN_PASSWORD` — Garmin 帳號密碼

**注意**：這是透過非官方套件 `garminconnect` 模擬登入，不是 Garmin 官方 API：
- 如果 Garmin 帳號有開**兩步驟驗證（2FA）**，自動登入會失敗，需要先關閉 2FA，或改用手動匯出的方式。
- Garmin 網站改版時這個套件可能會暫時失效，需要等套件更新。
- 想手動測試，可以到 repo 的 **Actions → Garmin Sync → Run workflow** 手動觸發一次，不用等排程。

## 2. 飲食紀錄（直接在對話裡傳照片給 Claude）

不用另外申請 API key、也沒有自動化 workflow。流程是：

1. 把食物照片傳到跟 Claude 的對話裡
2. Claude 直接看圖估算食物內容、熱量、蛋白質/碳水/脂肪
3. Claude 把這筆記錄加進 `data/meals.json`（不存照片檔，只留文字描述），commit 並 push
4. 重新整理網頁，「飲食紀錄」和「今日進度」就會更新

想手動補紀錄或修正估算值，也可以直接編輯 `data/meals.json`（格式參考 [data/README.md](data/README.md)）。

## 本機測試注意事項

`index.html` 用 `fetch()` 讀 JSON 檔，直接用瀏覽器打開本機檔案（`file://`）會因為瀏覽器安全限制讀不到，需要跑一個本機伺服器測試，例如在專案資料夾執行：

```
python -m http.server 8000
```

再用瀏覽器打開 `http://localhost:8000`。部署到 GitHub Pages 後就沒有這個問題，正常用網址打開即可。
