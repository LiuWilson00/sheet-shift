/**
 * Google Sheets 設定腳本
 *
 * 功能：
 * 1. 查詢現有工作表
 * 2. 安全新增缺少的工作表（不修改現有資料）
 * 3. 寫入測試資料
 *
 * 用法：
 *   node scripts/setup-google-sheets.mjs check     # 只查詢現況
 *   node scripts/setup-google-sheets.mjs setup     # 新增缺少的工作表 + 測試資料
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const settingsPath = path.join(__dirname, '../src/.env/settings.sheet.json');

// 讀取設定
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
const SPREADSHEET_ID = settings.spreadsheet_id;

// 建立認證
const auth = new google.auth.JWT({
  email: settings.client_email,
  key: settings.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// ==========================================
// 需要新增的工作表定義
// ==========================================

const REQUIRED_SHEETS = {
  '收貨人資訊': {
    headers: ['收貨人統一編號', '收貨人英文名稱', '收貨人電話', '海關註記'],
    testData: [
      ['A123456789', 'WANG XIAO MING', '0912345678', '注意'],
      ['B987654321', 'LIN MEI LI', '0923456789', ''],
      ['C555666777', 'CHEN DA WEI', '0933445566', '黑名單'],
      ['D111222333', 'HUANG YI TING', '0944556677', ''],
      ['E888999000', 'WU ZHI HONG', '0955667788', '查驗'],
    ],
  },
  '問題件': {
    headers: ['貨物名稱'],
    testData: [
      ['電子煙'],
      ['仿冒品'],
      ['毒品'],
      ['槍械零件'],
      ['管制藥品'],
    ],
  },
  '艙單編號設定': {
    headers: ['設定名稱', '格式定義', '黑名單規則', '當前編號', '建立時間', '更新時間'],
    testData: [
      [
        '台北港編號',
        JSON.stringify({ segments: [{ type: 'alpha', length: 3 }, { type: 'numeric', length: 2 }] }),
        JSON.stringify({ ranges: [], singles: [] }),
        'AAA00',
        '2026-02-05T10:00:00.000Z',
        '2026-02-05T10:00:00.000Z',
      ],
      [
        '高雄港編號',
        JSON.stringify({ segments: [{ type: 'alpha', length: 2 }, { type: 'numeric', length: 3 }] }),
        JSON.stringify({ ranges: [{ start: 'AA100', end: 'AA199' }], singles: ['AB000'] }),
        'AA200',
        '2026-02-05T10:00:00.000Z',
        '2026-02-05T10:00:00.000Z',
      ],
    ],
  },
};

// ==========================================
// 查詢現有工作表
// ==========================================

async function getExistingSheets() {
  const res = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties.title,sheets.properties.sheetId',
  });

  return res.data.sheets.map((s) => ({
    title: s.properties.title,
    sheetId: s.properties.sheetId,
  }));
}

async function getSheetData(sheetName) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}`,
    });
    return res.data.values || [];
  } catch (err) {
    if (err.code === 400) return null; // 工作表不存在
    throw err;
  }
}

// ==========================================
// 新增工作表
// ==========================================

async function addSheet(title) {
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: { title },
          },
        },
      ],
    },
  });
  const newSheetId = res.data.replies[0].addSheet.properties.sheetId;
  console.log(`  ✅ 已新增工作表「${title}」(sheetId: ${newSheetId})`);
  return newSheetId;
}

async function writeData(sheetName, headers, data) {
  const values = [headers, ...data];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });

  console.log(`  ✅ 已寫入 ${data.length} 筆測試資料到「${sheetName}」`);
}

// ==========================================
// 主程式
// ==========================================

async function check() {
  console.log('🔍 查詢 Google Sheets 現況...\n');
  console.log(`📊 Spreadsheet ID: ${SPREADSHEET_ID}\n`);

  const existingSheets = await getExistingSheets();
  console.log(`現有工作表 (${existingSheets.length} 個):`);
  for (const sheet of existingSheets) {
    const data = await getSheetData(sheet.title);
    const rowCount = data ? data.length : 0;
    const headers = data && data.length > 0 ? data[0].join(', ') : '(空)';
    console.log(`  📋 ${sheet.title} (sheetId: ${sheet.sheetId})`);
    console.log(`     行數: ${rowCount}, 標題: ${headers}`);
  }

  console.log('\n需要的工作表:');
  for (const name of Object.keys(REQUIRED_SHEETS)) {
    const exists = existingSheets.some((s) => s.title === name);
    console.log(`  ${exists ? '✅' : '❌'} ${name} - ${exists ? '已存在' : '尚未建立'}`);
  }
}

async function setup() {
  console.log('🔧 開始設定 Google Sheets...\n');
  console.log(`📊 Spreadsheet ID: ${SPREADSHEET_ID}\n`);

  const existingSheets = await getExistingSheets();
  const existingNames = new Set(existingSheets.map((s) => s.title));

  console.log(`現有工作表: ${[...existingNames].join(', ')}\n`);

  for (const [name, config] of Object.entries(REQUIRED_SHEETS)) {
    if (existingNames.has(name)) {
      // 工作表已存在 - 檢查是否有資料
      const data = await getSheetData(name);
      const rowCount = data ? data.length : 0;
      console.log(`⏭️  工作表「${name}」已存在 (${rowCount} 行) - 跳過，不修改現有資料`);
    } else {
      // 工作表不存在 - 新增
      console.log(`\n📝 新增工作表「${name}」...`);
      await addSheet(name);
      await writeData(name, config.headers, config.testData);
    }
  }

  console.log('\n✅ 設定完成！\n');

  // 驗證
  console.log('🔍 驗證結果:');
  const updatedSheets = await getExistingSheets();
  for (const name of Object.keys(REQUIRED_SHEETS)) {
    const exists = updatedSheets.some((s) => s.title === name);
    if (exists) {
      const data = await getSheetData(name);
      const rowCount = data ? data.length - 1 : 0; // 減去標題行
      console.log(`  ✅ ${name} - ${rowCount} 筆資料`);
    } else {
      console.log(`  ❌ ${name} - 建立失敗`);
    }
  }
}

// 執行
const command = process.argv[2] || 'check';

if (command === 'check') {
  check().catch((err) => {
    console.error('❌ 錯誤:', err.message);
    process.exit(1);
  });
} else if (command === 'setup') {
  setup().catch((err) => {
    console.error('❌ 錯誤:', err.message);
    process.exit(1);
  });
} else {
  console.log('用法: node scripts/setup-google-sheets.mjs [check|setup]');
  process.exit(1);
}
