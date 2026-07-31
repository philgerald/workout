// Paste this into Extensions → Apps Script on your meals Google Sheet,
// then deploy it as a Web App (Execute as: Me, Who has access: Anyone).
// See SETUP.md for the full deployment steps.

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.date || "",
    data.time || "",
    data.description || "",
    data.calories || 0,
    data.protein || 0,
    data.carbs || 0,
    data.fat || 0,
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
