var GolodDB = (function() {
  var db = null;
  var initialized = false;
  var pending = [];

  // เพิ่มตัวแปรเช็คสถานะการโหลด SDK
  function init() {
    // ถ้ารอเกิน 10 วินาทีแล้วยังโหลดไม่ได้ ให้แจ้งเตือน
    if (typeof firebase === 'undefined') {
        console.error("[GolodDB] ไม่พบ Firebase SDK!");
        var el = document.getElementById("report-wrap");
        if(el) el.innerHTML = '<div class="loading">❌ โหลดไฟล์ Firebase ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตหรือไฟล์ระบบ</div>';
        return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      db = firebase.firestore();
      initialized = true;
      console.log("[GolodDB] Firestore connected");
      pending.forEach(function(fn) { fn(); });
      pending = [];
    } catch(e) {
      console.error("[GolodDB] init error:", e);
    }
  }

  function ready(fn) {
    if (initialized) fn();
    else pending.push(fn);
  }

  // ดึง 500 บิลแบบเร็วที่สุด (ตัดการเรียงลำดับซับซ้อนทิ้ง)
  function getBillsNew(limitN) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        // ใช้ limit อย่างเดียว ไม่ใช้ orderBy เพื่อเลี่ยงปัญหา Index
        db.collection("bills").limit(limitN || 500).get()
          .then(function(snap) {
            var bills = [];
            snap.forEach(function(doc) { bills.push(doc.data()); });
            
            // เรียงวันที่ในหน่วยความจำ (เร็วกว่าให้ Firestore เรียง)
            bills.sort(function(a, b) {
              var da = a.createdAt || a.updatedAt || a.date || "";
              var dbVal = b.createdAt || b.updatedAt || b.date || "";
              return (da > dbVal) ? -1 : 1;
            });
            resolve(bills);
          })
          .catch(function(err) {
            console.error("Error:", err);
            resolve([]);
          });
      });
    });
  }
  
  return { init: init, ready: ready, getBillsNew: getBillsNew };
})();