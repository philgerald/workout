# 自動記錄設定

網頁會讀 `data/workouts.json`（Garmin 訓練）和 `data/meals.json`（飲食）並顯示在「今日進度」「訓練紀錄」「飲食紀錄」三個區塊。

## 1. 訓練紀錄（Garmin 自動同步）

用 `.github/workflows/garmin-sync.yml`，每天 **07:30 和 21:00**（台灣時間）自動抓取 Garmin Connect 的活動寫入 `data/workouts.json`。

（GitHub Actions 排程時間可能會延遲個幾分鐘才觸發，屬正常現象。）

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

### 方式 B：手機拍照給 AI 估算，貼上 Google Sheet（全程手機完成）

Claude／Gemini App 目前沒有寫入你 Google Sheet 的權限，所以是「AI 估算 → 你複製貼上」，不是全自動：

1. 建立一個 Google Sheet，第一列（標題列）依序填：`date,time,description,calories,protein,carbs,fat`
   - `date` 格式 `2026-07-31`，`time` 格式 `07:00`，其餘數字欄位單位是 kcal / 公克
2. 在 Google Sheet 選單 **檔案 → 共用 → 發布到網路**，選這個工作表、格式選 **CSV**，發布後複製那個網址
3. 打開 [index.html](index.html)，找到 `const MEALS_CSV_URL = "";` 這一行，把網址貼進雙引號裡
4. 手機傳食物照片給 Claude 或 Gemini，請它輸出成**一行、用 Tab 分隔**的文字，可以直接複製這段指令用：
   > 幫我看這張食物照片，估算熱量和 macros，用 Tab 分隔輸出一行，格式：日期(YYYY-MM-DD) Tab 時間(HH:MM) Tab 食物描述 Tab 熱量 Tab 蛋白質 Tab 碳水 Tab 脂肪，不要有其他文字
5. 複製 AI 回傳的那一行文字，打開手機 Google Sheet App，點新的一列第一格，**貼上**——因為是 Tab 分隔，貼上時會自動切成七個欄位，不用手動一格一格打
6. 網頁重新整理就會自動抓 Sheet 最新內容顯示

**注意**：CSV 發布網址是公開的，任何人拿到網址都能看到裡面資料，不需要登入。如果想要不公開，需要改用需要驗證的 Google Sheets API，設定會更複雜，需要的話再跟我說。

### 方式 C：網頁上的「新增一筆」表單，直接寫入 Google Sheet（免複製貼上）

網頁已經有一個手動輸入表單（在「飲食紀錄」區塊最上面）。預設它只存在你這台裝置的瀏覽器裡，要貼去 Sheet 才會永久保存。如果想讓表單**按下去就直接寫進 Sheet**，需要幫 Sheet 部署一個 Google Apps Script Web App（不用另外的後端主機，完全在 Google 這邊跑）：

1. 打開你的飲食 Google Sheet，選單 **擴充功能 → Apps Script**
2. 把專案裡 `Code.gs` 的內容清空，貼上這個 repo 的 [google-apps-script/Code.gs](google-apps-script/Code.gs) 內容
3. 存檔，接著點右上角 **部署 → New deployment**（新增部署作業）
4. 類型選 **Web app**，設定：
   - Execute as（執行身份）：**Me**（你自己）
   - Who has access（誰可以存取）：**Anyone**（任何人）
5. 按部署，第一次會跳出 Google 的授權畫面（因為是你自己寫的腳本，Google 會顯示「未經驗證」的警告），選 **Advanced／進階 → 前往...（不安全）** 繼續授權即可，這是正常的，因為腳本沒有送去 Google 審核，但只有你自己在用
6. 部署完成後複製那組網址（結尾是 `/exec`）
7. 打開 [index.html](index.html)，找到 `const MEALS_WRITE_URL = "";`，把網址貼進雙引號裡
8. 之後在網頁表單按「加入」，就會直接送進 Google Sheet，不用再複製貼上

設定好方式 C 之後，表單就不會再顯示 Tab 分隔的文字，而是直接顯示「已送出到 Google Sheet」。

### 方式 D：拍照存 Google Drive，網頁按鈕觸發 Gemini 自動分析（全自動、key 不外露）

這個方式全程手機完成，而且 Gemini API key 只存在 Apps Script 的伺服器端設定裡，不會出現在網頁原始碼、也不會被推上 GitHub。前提是方式 C 的 Apps Script 已經部署好。

1. 去 [aistudio.google.com/apikey](https://aistudio.google.com/apikey) 申請一組 Gemini API key
2. 在 Google Drive 建一個資料夾（例如取名「meals-inbox」），專門放要分析的食物照片。打開這個資料夾，網址列 `folders/` 後面那串英數字就是資料夾 ID，複製起來
3. 回到你的 Apps Script 專案（跟方式 C 同一個），把 `google-apps-script/Code.gs` 最新版內容整個覆蓋貼上去（比方式 C 當初貼的版本多了 `doGet`、Drive 掃描和 Gemini 呼叫的程式碼）
4. 左側選單點 **專案設定**（齒輪圖示）→ 往下捲到 **指令碼屬性**，新增兩筆：
   - `GEMINI_API_KEY` — 你的 Gemini API key
   - `MEALS_INBOX_FOLDER_ID` — 剛剛複製的 Drive 資料夾 ID
5. 回到編輯器，**部署 → 管理部署作業**，點現有部署旁邊的鉛筆（編輯），版本選 **新版本**，再按部署——這樣網址（`/exec`）維持不變，但會套用新程式碼
6. 打開網頁「飲食紀錄」區塊，會看到「拍照自動估算」卡片和一個「解析 Google Drive 收件匣」按鈕

之後流程：手機用 Google Drive App 把食物照片存進 `meals-inbox` 資料夾 → 打開網頁按「解析 Google Drive 收件匣」→ Apps Script 在背景讀取資料夾裡的照片、逐張呼叫 Gemini 估算、寫進 Sheet、刪掉已處理的照片 → 按鈕下方會顯示處理了幾筆 → 重新整理頁面就看得到。

想手動補紀錄或修正估算值，也可以直接編輯 `data/meals.json`（方式 A 用這個）或 Google Sheet 本身（方式 B/C/D 用這個），格式參考 [data/README.md](data/README.md)。

## 本機測試注意事項

`index.html` 用 `fetch()` 讀 JSON 檔，直接用瀏覽器打開本機檔案（`file://`）會因為瀏覽器安全限制讀不到，需要跑一個本機伺服器測試，例如在專案資料夾執行：

```
python -m http.server 8000
```

再用瀏覽器打開 `http://localhost:8000`。部署到 GitHub Pages 後就沒有這個問題，正常用網址打開即可。
