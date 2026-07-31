// Paste this into Extensions → Apps Script on your meals Google Sheet,
// then deploy it as a Web App (Execute as: Me, Who has access: Anyone).
// See SETUP.md for the full deployment steps, including the two Script
// Properties this needs: GEMINI_API_KEY and MEALS_INBOX_FOLDER_ID.

// ---- used by the on-page "新增一筆" form / photo upload ----
function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  if (body.action === "parseInbox") {
    return parseInboxAndRespond();
  }
  if (body.action === "uploadPhoto") {
    return uploadPhotoAndRespond(body);
  }
  appendMealRow(body);
  return jsonResponse({ ok: true });
}

// ---- used by the on-page "解析 Google Drive 收件匣" button ----
function doGet(e) {
  if (e.parameter.action === "parseInbox") {
    return parseInboxAndRespond();
  }
  if (e.parameter.action === "ping") {
    return jsonResponse({ ok: true, pong: true });
  }
  return jsonResponse({ ok: false, error: "unknown action" });
}

function appendMealRow(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  sheet.appendRow([
    data.date || "",
    data.time || "",
    data.description || "",
    data.calories || 0,
    data.protein || 0,
    data.carbs || 0,
    data.fat || 0,
  ]);
}

// saves a base64-encoded photo (sent from the on-page uploader) into the Drive inbox folder
function uploadPhotoAndRespond(body) {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty("MEALS_INBOX_FOLDER_ID");
  if (!folderId) {
    return jsonResponse({ ok: false, error: "缺少 Script Properties：MEALS_INBOX_FOLDER_ID，請到專案設定裡新增。" });
  }
  if (!body.data) {
    return jsonResponse({ ok: false, error: "沒有收到照片資料。" });
  }

  var mimeType = body.mimeType || "image/jpeg";
  var filename = body.filename || ("meal-" + new Date().getTime() + ".jpg");
  var bytes = Utilities.base64Decode(body.data);
  var blob = Utilities.newBlob(bytes, mimeType, filename);

  DriveApp.getFolderById(folderId).createFile(blob);

  return jsonResponse({ ok: true, filename: filename });
}

// scans the Drive inbox folder for photos, estimates each with Gemini,
// appends a row per photo, then trashes the processed photo
function parseInboxAndRespond() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty("MEALS_INBOX_FOLDER_ID");
  var apiKey = props.getProperty("GEMINI_API_KEY");

  if (!folderId || !apiKey) {
    return jsonResponse({
      ok: false,
      error: "缺少 Script Properties：MEALS_INBOX_FOLDER_ID 或 GEMINI_API_KEY，請到專案設定裡新增。",
    });
  }

  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFiles();
  var processed = [];
  var failed = [];

  while (files.hasNext()) {
    var file = files.next();
    if (file.getMimeType().indexOf("image/") !== 0) continue;

    try {
      var result = estimateWithGemini(apiKey, file.getBlob());
      var now = new Date();
      appendMealRow({
        date: Utilities.formatDate(now, "Asia/Taipei", "yyyy-MM-dd"),
        time: Utilities.formatDate(now, "Asia/Taipei", "HH:mm"),
        description: result.description || "",
        calories: result.calories || 0,
        protein: result.protein || 0,
        carbs: result.carbs || 0,
        fat: result.fat || 0,
      });
      file.setTrashed(true);
      processed.push(file.getName());
    } catch (err) {
      failed.push(file.getName() + "：" + err);
    }
  }

  return jsonResponse({ ok: true, processed: processed, failed: failed });
}

function estimateWithGemini(apiKey, blob) {
  var prompt =
    "這是一張食物照片，請估算內容並只回傳純 JSON（不要任何多餘文字或 markdown），" +
    '格式為 {"description": "...", "calories": 數字, "protein": 數字, "carbs": 數字, "fat": 數字}，' +
    "description 用繁體中文簡短描述吃了什麼，calories 單位 kcal，其餘單位為公克，是概估值即可。";

  var payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) } },
      ],
    }],
  };

  var resp = UrlFetchApp.fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey,
    {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    }
  );

  var raw = resp.getContentText();

  if (resp.getResponseCode() !== 200) {
    var errMsg = raw;
    try { errMsg = JSON.parse(raw).error.message; } catch (e) {}
    throw new Error("Gemini API 回傳 HTTP " + resp.getResponseCode() + "：" + errMsg);
  }

  var json = JSON.parse(raw);
  if (!json.candidates || !json.candidates.length) {
    throw new Error("Gemini 沒有回傳結果：" + raw.slice(0, 300));
  }

  var text = json.candidates[0].content.parts[0].text.trim();
  text = text.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();

  // if the model wrapped the JSON in prose, pull out the first {...} block
  var parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    var block = text.match(/\{[\s\S]*\}/);
    if (!block) throw new Error("無法解析 Gemini 回覆：" + text.slice(0, 300));
    parsed = JSON.parse(block[0]);
  }

  // the model sometimes answers with "650 kcal" / "45g" instead of a plain number
  function num(v) {
    if (typeof v === "number") return v;
    var m = String(v == null ? "" : v).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : 0;
  }

  var out = {
    description: parsed.description || "",
    calories: num(parsed.calories),
    protein: num(parsed.protein),
    carbs: num(parsed.carbs),
    fat: num(parsed.fat),
  };

  if (!out.calories && !out.protein && !out.carbs && !out.fat) {
    throw new Error("Gemini 估算結果全為 0，原始回覆：" + text.slice(0, 300));
  }

  return out;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
