// ===== GOLOD SHEETS SYNC =====
// เพิ่ม row ใหม่ใน Google Sheet "delivery" ทุกครั้งที่ออกบิล
// ทำงานผ่าน Google Apps Script Web App endpoint

const SHEETS_SYNC = (function() {
  // Sheet ID ของระบบเดิม
  const SHEET_ID = '1fkDQpzrAq30qJfIaKCEWabvWk4J4plODyQrTSmt95bw';
  const SHEET_NAME = 'delivery';
  
  // Apps Script Web App URL (ต้อง deploy เป็น Web App ก่อน)
  // จะใส่ URL หลัง deploy
  var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxtuW-GI_s6ZR4Pjmyz5RoLU8Twqk-prST96HX6KQwvf1nq0wDhSb-6T3UGmf4LdZdn/exec';
  
  function setWebAppUrl(url) {
    WEB_APP_URL = url;
    try { localStorage.setItem('golod_sheets_webapp_url', url); } catch(e) {}
  }
  
  function getWebAppUrl() {
    // URL hardcoded — ไม่พึ่ง localStorage
    return 'https://script.google.com/macros/s/AKfycbxtuW-GI_s6ZR4Pjmyz5RoLU8Twqk-prST96HX6KQwvf1nq0wDhSb-6T3UGmf4LdZdn/exec';
  }

  // แปลงบิลเป็น row สำหรับ Google Sheet
  function billToSheetRow(bill) {
    // format วันที่
    var now = new Date();
    var dateStr = now.toLocaleDateString('th-TH', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    var timeStr = now.toLocaleTimeString('th-TH', {
      hour: '2-digit', minute: '2-digit'
    });
    var timestamp = dateStr + ' ' + timeStr;

    // รวมรายการสินค้า
    var items = '';
    if (Array.isArray(bill.items)) {
      items = bill.items.map(function(i) {
        return (i.desc || '') + (i.qty ? ' x' + i.qty : '');
      }).join(', ');
    }

    // แปลงการเก็บเงิน
    var payMap = {
      'origin': 'ต้นทาง', 'dest': 'ปลายทาง', 'dest_cash': 'ปลายทาง',
      'transfer': 'โอน', 'credit': 'เครดิต',
      'dest_transfer': 'โอนบริษัท', 'dest_driver': 'โอนคนรถ'
    };
    var payMethod = payMap[bill.freightPay] || bill.freightPay || '';

    // แปลงสาขา
    var branchMap = { 'bkk': 'กรุงเทพ', 'krt': 'นครราชสีมา', 'ssk': 'ศรีสะเกษ' };
    var branch = branchMap[bill.branch] || bill.branch || '';

    // A=ID (ว่าง), B=BillNo, C=Timestamp, D=Is_edited, E=Edit_history
    // F=ผู้ส่ง, G=ผู้รับ, H=โทร, I=จังหวัดปท, J=อำเภอปท
    // K=ของที่ส่ง, L=ค่าขนส่ง, M=การเก็บเงิน, N=COD, O=รูปถ่าย
    // P=คนขับ, Q=ลายเซ็น, R=สถานะ, S=วันที่ส่ง, T=สาขา, U=คนจัด, V=สลิปโอน1
    // แยก date และ time
    var dateOnly = now.toLocaleDateString('th-TH', {year:'numeric',month:'2-digit',day:'2-digit'});
    var timeOnly = now.toLocaleTimeString('th-TH', {hour:'2-digit',minute:'2-digit',second:'2-digit'});

    return [
      '',                           // A: ID (auto)
      bill.billNo || '',            // B: BillNo
      dateOnly,                     // C: วันที่ออกบิล
      timeOnly,                     // D: Timestamp (เวลา)
      '',                           // E: Is_edited
      '',                           // F: Edit_history
      bill.senderName || '',        // G: ผู้ส่ง
      bill.receiverName || '',      // H: ผู้รับ
      bill.receiverPhone || '',     // I: เบอร์โทรผู้รับ
      bill.destProv || '',          // J: จังหวัดปลายทาง
      bill.destAmphoe || '',        // K: อำเภอปลายทาง
      items,                        // L: ของที่ส่ง
      bill.freightNet || 0,         // M: ค่าขนส่ง
      payMethod,                    // N: การเก็บเงิน
      bill.codTotal || 0,           // O: COD
      '',                           // P: รูปถ่าย (คนขับใส่ทีหลัง)
      '',                           // Q: คนขับ (คนรถ — ว่างก่อน TripManager ใส่ทีหลัง)
      '',                           // R: ลายเซ็น
      'ออกบิลรับของ',              // S: สถานะ
      '',                           // T: วันที่ส่ง
      branch,                       // U: สาขา
      '',                           // V: คนจัด (TripManager update เมื่อ assign งาน)
      '',                           // W: สลิปโอน1
    ];
  }

  // ส่งข้อมูลไป Apps Script Web App
  function appendToSheet(bill) {
    return new Promise(function(resolve) {
      var url = getWebAppUrl();
      if (!url) { resolve({ skipped: true }); return; }

      var row = billToSheetRow(bill);
      // ส่งเป็น GET params
      var qs = 'action=appendRow' +
        '&sheetId=' + encodeURIComponent(SHEET_ID) +
        '&sheetName=' + encodeURIComponent(SHEET_NAME) +
        '&billNo=' + encodeURIComponent(bill.billNo || '') +
        '&row=' + encodeURIComponent(JSON.stringify(row));
      
      var getUrl = url + '?' + qs;
      
      // no-cors fetch (ไม่ต้องรอ response)
      fetch(getUrl, { method: 'GET', mode: 'no-cors' })
        .then(function() {
          console.log('[SheetsSync] ✅ Sent to Sheet:', bill.billNo);
          resolve({ success: true });
        }).catch(function(e) {
          console.warn('[SheetsSync] ⚠ fetch failed, trying image trick');
          try { new Image().src = getUrl; } catch(e2) {}
          resolve({ fallback: true });
        });
    });
  }

  // ตรวจสอบว่า billNo มีใน sheet แล้วหรือยัง (ผ่าน Firestore)
  function checkBillExists(billNo) {
    var apiKey = 'AIzaSyCwgIOP-fIe5v4VOpnn3oblVYzqIGsCpK0';
    var projectId = 'status-81cd0';
    var url = 'https://firestore.googleapis.com/v1/projects/' + projectId +
      '/databases/(default)/documents/bills/' + encodeURIComponent(billNo) +
      '?key=' + apiKey;

    return fetch(url).then(function(r) {
      if (r.status === 404) return false;
      return r.json().then(function(d) {
        return !!(d && d.fields);
      });
    }).catch(function() { return false; });
  }

  return {
    appendToSheet: appendToSheet,
    billToSheetRow: billToSheetRow,
    setWebAppUrl: setWebAppUrl,
    getWebAppUrl: getWebAppUrl,
    checkBillExists: checkBillExists
  };
})();
