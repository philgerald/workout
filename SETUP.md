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

## 2. 飲食紀錄

有兩種方式，二選一都可以：

### 方式 A：對話裡傳照片給 Claude（不用手機也能設定，但要開著這台電腦的 Claude Code）

1. 把食物照片傳到跟 Claude 的對話裡
2. Claude 直接看圖估算食物內容、熱量、蛋白質/碳水/脂肪
3. Claude 把這筆記錄加進 `data/meals.json`，commit 並 push
4. 重新整理網頁就會更新

### 方式 B：手機用 Gemini App 寫入 Google Sheet（全程手機完成）

1. 建立一個 Google Sheet，第一列（標題列）依序填：`date,time,description,calories,protein,carbs,fat`
   - `date` 格式 `2026-07-31`，`time` 格式 `07:00`，其餘數字欄位單位是 kcal / 公克
2. 在 Google Sheet 選單 **檔案 → 共用 → 發布到網路**，選這個工作表、格式選 **CSV**，發布後複製那個網址
3. 打開 [index.html](index.html)，找到 `const MEALS_CSV_URL = "";` 這一行，把網址貼進雙引號裡
4. 之後在手機用 Gemini App 傳食物照片，請它幫你把估算結果（日期、時間、食物描述、熱量、蛋白質、碳水、脂肪）新增一列到這個 Google Sheet
5. 網頁重新整理就會自動抓 Sheet 最新內容顯示

**注意**：CSV 發布網址是公開的，任何人拿到網址都能看到裡面資料，不需要登入。如果想要不公開，需要改用需要驗證的 Google Sheets API，設定會更複雜，需要的話再跟我說。

想手動補紀錄或修正估算值，也可以直接編輯 `data/meals.json`（方式 A 用這個）或 Google Sheet 本身（方式 B 用這個），格式參考 [data/README.md](data/README.md)。

## 本機測試注意事項

`index.html` 用 `fetch()` 讀 JSON 檔，直接用瀏覽器打開本機檔案（`file://`）會因為瀏覽器安全限制讀不到，需要跑一個本機伺服器測試，例如在專案資料夾執行：

```
python -m http.server 8000
```

再用瀏覽器打開 `http://localhost:8000`。部署到 GitHub Pages 後就沒有這個問題，正常用網址打開即可。
