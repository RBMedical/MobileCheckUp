const SPREADSHEET_ID = '1QclDb5NqKukFDrxN35YP_s2Z_IkH97WvHvrVdUeE-gA';
const SHEET_DATA = 'Data';
const SHEET_PROGRAM = 'ProgramDetail';

const DATA_HEADERS = [
  'HN',
  'ชื่อ นามสกุล',
  'รหัสประจำตัว',
  'เลขบัตรประชาชน',
  'แผนก',
  'ตำแหน่ง',
  'ชั้นปี',
  'สาขา',
  'ห้อง',
  'โปรแกรม',
  'Customer',
  'ลำดับลงทะเบียน',
  'วันที่ลงทะเบียน',
  'เวลาลงทะเบียน'
];

function doGet(e) {
  const params = e.parameter || {};
  const action = params.action || 'ping';
  let result;

  try {
    if (action === 'search') result = searchEmployees(params.q || '');
    else if (action === 'register') result = registerEmployee(params.rowId);
    else if (action === 'update') result = updateEmployee(params);
    else if (action === 'delete') result = deleteEmployee(params.rowId);
    else result = { ok: true, message: 'Mobile Check Up Apps Script is ready.' };
  } catch (error) {
    result = { ok: false, message: error.message };
  }

  return jsonp_(result, params.callback);
}

function searchEmployees(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return { ok: true, rows: [] };

  const rows = getDataRows_();
  const matched = rows.map((row) => {
    const hn = String(row['HN'] || '').trim().toLowerCase();
    const employeeId = String(row['รหัสประจำตัว'] || '').trim().toLowerCase();
    const citizenId = String(row['เลขบัตรประชาชน'] || '').trim().toLowerCase();
    const fullName = String(row['ชื่อ นามสกุล'] || '').trim().toLowerCase();
    const exactMatch = hn === q || employeeId === q || citizenId === q;
    const nameMatch = fullName.indexOf(q) > -1;
    return { row: row, score: exactMatch ? 2 : nameMatch ? 1 : 0 };
  }).filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.row);

  return { ok: true, rows: matched.slice(0, 20) };
}

function updateEmployee(params) {
  const rowId = Number(params.rowId);
  if (!rowId || rowId < 2) throw new Error('ไม่พบแถวข้อมูลที่ต้องการแก้ไข');

  const sheet = getSheet_(SHEET_DATA);
  const row = DATA_HEADERS.map((header) => params[header] || '');
  sheet.getRange(rowId, 1, 1, DATA_HEADERS.length).setValues([row]);

  return { ok: true, row: rowToObject_(row, rowId) };
}

function deleteEmployee(rowId) {
  const id = Number(rowId);
  if (!id || id < 2) throw new Error('ไม่พบแถวข้อมูลที่ต้องการลบ');

  getSheet_(SHEET_DATA).deleteRow(id);
  return { ok: true, deletedRowId: id };
}

function registerEmployee(rowId) {
  const id = Number(rowId);
  if (!id || id < 2) throw new Error('กรุณาเลือกข้อมูลก่อนลงทะเบียน');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
  const sheet = getSheet_(SHEET_DATA);
  const values = sheet.getRange(id, 1, 1, DATA_HEADERS.length).getValues()[0];
  const row = rowToObject_(values, id);

  const sequence = nextRegisterSequence_();
  const now = new Date();
  const dateText = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  const timeText = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm');

  row['ลำดับลงทะเบียน'] = sequence;
  row['วันที่ลงทะเบียน'] = dateText;
  row['เวลาลงทะเบียน'] = timeText;

  sheet.getRange(id, 1, 1, DATA_HEADERS.length).setValues([DATA_HEADERS.map((header) => row[header] || '')]);

  const stickers = buildStickerRows_(row);
  return { ok: true, row: row, stickers: stickers };
  } finally {
    lock.releaseLock();
  }
}

function buildStickerRows_(dataRow) {
  const programName = String(dataRow['โปรแกรม'] || '').trim();
  if (!programName) return [];

  const programRows = getProgramRows_().filter((item) => {
    return String(item['โปรแกรม'] || '').trim() === programName;
  });

  const hn = String(dataRow['HN'] || '').trim();
  const paddedHn = hn.padStart(6, '0');

  return programRows.map((program) => {
    const specimenCode = String(program['specimen code'] || '').trim();
    const specimen = String(program['specimen'] || '').trim();
    const displayName = '(' + programName + dataRow['ชื่อ นามสกุล'] + ')';
    return {
      'ลำดับลงทะเบียน': dataRow['ลำดับลงทะเบียน'],
      'วันที่ลงทะเบียน': dataRow['วันที่ลงทะเบียน'],
      specimen: specimen,
      specimenCode: specimenCode,
      program: programName,
      displayName: displayName,
      fullName: dataRow['ชื่อ นามสกุล'],
      HN: hn,
      Customer: dataRow['Customer'],
      barcode: paddedHn + specimenCode,
      servicePoint: program['จุดบริการ'] || ''
    };
  });
}

function nextRegisterSequence_() {
  const sheet = getSheet_(SHEET_DATA);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;

  const sequenceCol = DATA_HEADERS.indexOf('ลำดับลงทะเบียน') + 1;
  const values = sheet.getRange(2, sequenceCol, lastRow - 1, 1).getValues().flat();
  const maxSequence = values.reduce((max, value) => {
    const num = Number(value);
    return num > max ? num : max;
  }, 0);

  return maxSequence + 1;
}

function getDataRows_() {
  const sheet = getSheet_(SHEET_DATA);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, DATA_HEADERS.length).getValues();
  return values.map((row, index) => rowToObject_(row, index + 2));
}

function getProgramRows_() {
  const sheet = getSheet_(SHEET_PROGRAM);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map((header) => String(header).trim());
  return values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

function rowToObject_(row, rowId) {
  const obj = { rowId: rowId };
  DATA_HEADERS.forEach((header, index) => {
    obj[header] = row[index] || '';
  });
  return obj;
}

function getSheet_(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error('ไม่พบ sheet: ' + sheetName);
  return sheet;
}

function jsonp_(data, callback) {
  const json = JSON.stringify(data);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
