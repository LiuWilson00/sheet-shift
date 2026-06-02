/**
 * Phase 0：為「用戶資訊」表新增 role / permissions 欄，並將 admin、Eason 設為 admin。
 *
 * 採最小變更（僅寫入 D/E 欄標頭與 admin/Eason 的 role），不動既有 name/account/password。
 * 具冪等性：重複執行只會維持同樣結果。
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

const ADMIN_ACCOUNTS = ['admin', 'Eason'];

(async () => {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = setting.spreadsheet_id;

  // 1) 讀取現況
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '用戶資訊',
  });
  const rows = res.data.values || [];
  const header = rows[0] || [];

  // 2) 確認 role/permissions 欄位位置（沒有就接在最後）
  let roleIdx = header.indexOf('role');
  let permIdx = header.indexOf('permissions');
  const updates = [];

  if (roleIdx === -1) {
    roleIdx = header.length;
    header[roleIdx] = 'role';
  }
  if (permIdx === -1) {
    permIdx = header.length;
    header[permIdx] = 'permissions';
  }
  // 寫回標頭
  updates.push({ range: '用戶資訊!1:1', values: [header] });

  // 3) 為每位使用者設定 role（admin/Eason → admin，其餘維持空白）
  const colLetter = (i) => String.fromCharCode('A'.charCodeAt(0) + i);
  rows.slice(1).forEach((row, i) => {
    const rowNumber = i + 2;
    const account = (row[1] || '').trim();
    const isAdmin = ADMIN_ACCOUNTS.some(
      (a) => a.toLowerCase() === account.toLowerCase(),
    );
    const desiredRole = isAdmin ? 'admin' : '';
    const currentRole = row[roleIdx] || '';
    if (currentRole !== desiredRole) {
      updates.push({
        range: `用戶資訊!${colLetter(roleIdx)}${rowNumber}`,
        values: [[desiredRole]],
      });
    }
  });

  // 4) 批次寫入
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: 'RAW', data: updates },
  });

  console.log(`套用 ${updates.length} 筆更新完成。`);
  ADMIN_ACCOUNTS.forEach((a) => console.log(`  ${a} → role=admin`));
})();
