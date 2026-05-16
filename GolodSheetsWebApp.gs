/**
 * GOLOD SHEETS WEB APP
 * Deploy เป็น Apps Script Web App เพื่อรับ POST จาก ThermalBill
 * แล้ว append row ลงใน Google Sheet delivery
 * 
 * วิธี deploy:
 * 1. เปิด Apps Script (script.google.com)
 * 2. สร้าง project ใหม่ หรือเพิ่มไฟล์ใหม่ใน project เดิม
 * 3. paste โค้ดนี้
 * 4. Deploy → New deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy Web App URL ไปใส่ใน GolodApp settings
 */

const DELIVERY_SHEET_ID = '1fkDQpzrAq30qJfIaKCEWabvWk4J4plODyQrTSmt95bw';
const DELIVERY_SHEET_NAME = 'delivery';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    if (data.action === 'appendRow') {
      var result = appendRowToSheet_(data);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // ถ้ามี action parameter = รับข้อมูลจาก GET request
  try {
    var params = e.parameter || {};
    if (params.action === 'updateCol' && params.billNo && params.col) {
      var updData = {
        sheetId: params.sheetId || DELIVERY_SHEET_ID,
        sheetName: params.sheetName || DELIVERY_SHEET_NAME,
        billNo: params.billNo,
        col: params.col,
        value: params.value || ''
      };
      var updResult = updateBillColumn_(updData);
      return ContentService
        .createTextOutput(JSON.stringify(updResult))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (params.action === 'appendRow' && params.row) {
      var data = {
        action: 'appendRow',
        sheetId: params.sheetId || DELIVERY_SHEET_ID,
        sheetName: params.sheetName || DELIVERY_SHEET_NAME,
        row: JSON.parse(params.row),
        billNo: params.billNo || ''
      };
      var result = appendRowToSheet_(data);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    Logger.log('doGet error: ' + err.message);
  }
  
  // ทดสอบว่า Web App ทำงานได้
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', service: 'GolodSheetsWebApp' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* =======================================================
   UPDATE SINGLE COLUMN (สำหรับ TripManager update V=คนจัด, Q=คนขับ)
======================================================= */
function updateBillColumn_(data) {
  var sheetId = data.sheetId || DELIVERY_SHEET_ID;
  var sheetName = data.sheetName || DELIVERY_SHEET_NAME;
  var billNo = (data.billNo || '').toString().trim().toUpperCase();
  var colLetter = data.col || '';   // เช่น "V" หรือ "Q"
  var value = data.value || '';
  
  if (!billNo || !colLetter) return { error: 'missing billNo or col' };
  
  var ss = SpreadsheetApp.openById(sheetId);
  var sh = ss.getSheetByName(sheetName);
  if (!sh) return { error: 'sheet not found' };
  
  // หาแถวของ billNo
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return { error: 'no data' };
  
  var billCol = sh.getRange(2, 2, lastRow - 1, 1).getValues();
  var targetRow = -1;
  for (var i = billCol.length - 1; i >= 0; i--) {
    if (String(billCol[i][0]).trim().toUpperCase() === billNo) {
      targetRow = i + 2;
      break;
    }
  }
  
  if (targetRow < 0) return { error: 'billNo not found: ' + billNo };
  
  // แปลง column letter → number
  var colNum = colLetter.toUpperCase().charCodeAt(0) - 64;
  sh.getRange(targetRow, colNum).setValue(value);
  
  Logger.log('✅ Updated billNo=' + billNo + ' col=' + colLetter + ' val=' + value + ' row=' + targetRow);
  return { success: true, billNo: billNo, col: colLetter, value: value, row: targetRow };
}

function appendRowToSheet_(data) {
  var sheetId = data.sheetId || DELIVERY_SHEET_ID;
  var sheetName = data.sheetName || DELIVERY_SHEET_NAME;
  var row = data.row;
  var billNo = data.billNo || '';
  
  if (!row || !Array.isArray(row)) {
    return { error: 'no row data' };
  }
  
  var ss = SpreadsheetApp.openById(sheetId);
  var sh = ss.getSheetByName(sheetName);
  
  if (!sh) {
    return { error: 'sheet not found: ' + sheetName };
  }
  
  // ตรวจว่า billNo มีแล้วหรือยัง (ป้องกัน duplicate)
  if (billNo) {
    var lastRow = sh.getLastRow();
    if (lastRow > 1) {
      var billCol = sh.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var i = 0; i < billCol.length; i++) {
        if (String(billCol[i][0]).trim().toUpperCase() === billNo.toUpperCase()) {
          return { skipped: true, reason: 'duplicate billNo: ' + billNo };
        }
      }
    }
  }
  
  // Auto-generate ID (A column)
  var newRow = sh.getLastRow() + 1;
  row[0] = newRow - 1; // ID = running number
  
  // Append row
  sh.appendRow(row);
  
  Logger.log('✅ Appended billNo=' + billNo + ' at row=' + sh.getLastRow());
  
  return { 
    success: true, 
    billNo: billNo,
    row: sh.getLastRow()
  };
}
