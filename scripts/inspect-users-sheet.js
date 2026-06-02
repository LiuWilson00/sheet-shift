/**
 * 檢視「用戶資訊」表的結構與內容（密碼遮罩）
 * 用於 Phase 0 設定前確認現況。
 */
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const setting = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/.env/settings.sheet.json'), 'utf8'),
);

const auth = new google.auth.JWT({
  email: setting.client_email,
  key: setting.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

(async () => {
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: setting.spreadsheet_id,
    range: '用戶資訊',
  });
  const rows = res.data.values || [];
  const header = rows[0] || [];
  console.log('HEADER:', JSON.stringify(header));
  console.log('ROW COUNT (含標頭):', rows.length);

  const pwIdx = header.indexOf('password');
  rows.slice(1).forEach((row, i) => {
    const masked = row.map((cell, idx) =>
      idx === pwIdx && cell ? '***' : cell,
    );
    console.log(`row ${i + 2}:`, JSON.stringify(masked));
  });
})();
