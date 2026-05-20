// ===== GOLOD FIREBASE SERVICE =====
// โหลด Firebase SDK จาก CDN (compat version ใช้ได้กับ vanilla JS)

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCwgIOP-fIe5v4VOpnn3oblVYzqIGsCpK0",
  authDomain: "status-81cd0.firebaseapp.com",
  projectId: "status-81cd0",
  storageBucket: "status-81cd0.firebasestorage.app",
  messagingSenderId: "974079486903",
  appId: "1:974079486903:web:ace12122095b03c60a1632"
};

var GolodDB = (function() {
  var db = null;
  var initialized = false;
  var pending = [];

  // init Firebase
  function init() {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      db = firebase.firestore();
      initialized = true;
      console.log("[GolodDB] Firestore connected");
      // flush pending
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

  // ===== BILLS =====
  function saveBill(bill) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("bills").doc(bill.billNo).set(bill)
          .then(function() {
            // sync to localStorage ด้วย
            try {
              var bills = JSON.parse(localStorage.getItem("golod_bills") || "[]");
              var idx = bills.findIndex(function(b) { return b.billNo === bill.billNo; });
              if (idx >= 0) bills[idx] = bill; else bills.unshift(bill);
              localStorage.setItem("golod_bills", JSON.stringify(bills));
            } catch(e) {}
            resolve(bill);
          })
          .catch(reject);
      });
    });
  }

  function getBills(clerkCode, isAdmin) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        var query = db.collection("bills").orderBy("createdAt", "desc").limit(500);
        if (!isAdmin && clerkCode) {
          query = db.collection("bills").where("clerkCode", "==", clerkCode).orderBy("createdAt", "desc").limit(200);
        }
        query.get()
          .then(function(snap) {
            var bills = [];
            snap.forEach(function(doc) { bills.push(doc.data()); });
            // sync to localStorage
            try {
              if (isAdmin) {
                localStorage.setItem("golod_bills", JSON.stringify(bills));
              } else {
                // merge: เก็บบิลคนอื่นไว้ เพิ่มบิลตัวเอง
                var all = JSON.parse(localStorage.getItem("golod_bills") || "[]");
                var myBillNos = new Set(bills.map(function(b){ return b.billNo; }));
                var others = all.filter(function(b){ return !myBillNos.has(b.billNo); });
                localStorage.setItem("golod_bills", JSON.stringify([...bills, ...others]));
              }
            } catch(e) {}
            resolve(bills);
          })
          .catch(function(e) {
            console.warn("[GolodDB] getBills error, using localStorage:", e);
            // fallback localStorage
            try {
              var local = JSON.parse(localStorage.getItem("golod_bills") || "[]");
              resolve(local);
            } catch(e2) { resolve([]); }
          });
      });
    });
  }

  function updateBill(billNo, updates) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("bills").doc(billNo).update(updates)
          .then(function() {
            // sync localStorage
            try {
              var bills = JSON.parse(localStorage.getItem("golod_bills") || "[]");
              var idx = bills.findIndex(function(b){ return b.billNo === billNo; });
              if (idx >= 0) bills[idx] = Object.assign({}, bills[idx], updates);
              localStorage.setItem("golod_bills", JSON.stringify(bills));
            } catch(e) {}
            resolve();
          }).catch(reject);
      });
    });
  }

  // ===== CONTACTS =====
  function saveContact(key, contact) {
    return new Promise(function(resolve) {
      ready(function() {
        var docId = key + "_" + (contact.name || "").replace(/[^a-zA-Zก-๙]/g, "_").slice(0, 30);
        db.collection("contacts").doc(docId).set(Object.assign({ key: key }, contact), { merge: true })
          .then(resolve).catch(function(e) { console.warn("saveContact:", e); resolve(); });
      });
    });
  }

  function getContacts(key) {
    return new Promise(function(resolve) {
      ready(function() {
        db.collection("contacts").where("key", "==", key).limit(200).get()
          .then(function(snap) {
            var list = [];
            snap.forEach(function(doc) { list.push(doc.data()); });
            resolve(list);
          }).catch(function(e) {
            console.warn("getContacts:", e);
            try {
              var c = JSON.parse(localStorage.getItem("golod_contacts") || "{}");
              resolve(c[key] || []);
            } catch(e2) { resolve([]); }
          });
      });
    });
  }

  // ===== USERS =====
  function saveUser(user) {
    return new Promise(function(resolve) {
      ready(function() {
        db.collection("users").doc(user.username).set(user, { merge: true })
          .then(resolve).catch(function(e) { console.warn("saveUser:", e); resolve(); });
      });
    });
  }

  function getUsers() {
    return new Promise(function(resolve) {
      ready(function() {
        db.collection("users").get()
          .then(function(snap) {
            var users = [];
            snap.forEach(function(doc) { users.push(doc.data()); });
            if (users.length > 0) {
              localStorage.setItem("golod_users_v1", JSON.stringify(users));
            }
            resolve(users);
          }).catch(function(e) {
            console.warn("getUsers:", e);
            try {
              var u = JSON.parse(localStorage.getItem("golod_users_v1") || "[]");
              resolve(u);
            } catch(e2) { resolve([]); }
          });
      });
    });
  }

  // ===== EDIT LOGS =====
  function saveEditLog(log) {
    return new Promise(function(resolve) {
      ready(function() {
        db.collection("editLogs").add(log)
          .then(resolve).catch(function(e) { console.warn("saveEditLog:", e); resolve(); });
      });
    });
  }

  function getEditLogs() {
    return new Promise(function(resolve) {
      ready(function() {
        db.collection("editLogs").orderBy("editedAt", "desc").limit(100).get()
          .then(function(snap) {
            var logs = [];
            snap.forEach(function(doc) { logs.push(doc.data()); });
            resolve(logs);
          }).catch(function(e) {
            try {
              var l = JSON.parse(localStorage.getItem("golod_edit_logs") || "[]");
              resolve(l);
            } catch(e2) { resolve([]); }
          });
      });
    });
  }

  // ===== REALTIME LISTENER =====
  function listenBills(clerkCode, isAdmin, callback) {
    var query = db.collection("bills").orderBy("createdAt","desc").limit(100);
    if (!isAdmin && clerkCode) {
      query = db.collection("bills").where("clerkCode","==",clerkCode).orderBy("createdAt","desc").limit(100);
    }
    return query.onSnapshot(function(snap) {
      var bills = [];
      snap.forEach(function(doc) { bills.push(doc.data()); });
      callback(bills);
    });
  }

  function getAllBills(limitN) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        // ไม่ใช้ orderBy เพื่อให้ดึงได้ทุกบิล รวมบิลที่ไม่มี createdAt
        db.collection("bills").limit(limitN||5000).get()
          .then(function(snap) {
            var bills=[];
            snap.forEach(function(doc){ bills.push(doc.data()); });
            // เรียงตาม date+billNo แทน
            bills.sort(function(a,b){
              var da=a.date||""; var db2=b.date||"";
              if(da!==db2) return da>db2?-1:1;
              return (a.billNo||"")>(b.billNo||"")?-1:1;
            });
            resolve(bills);
          }).catch(reject);
      });
    });
  }

// ดึงบิลแบบผสมผสาน (เบาและเร็วกว่าเดิมมาก ป้องกันแอปค้าง)
  function getBillsNew(limitN) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        var docId = firebase.firestore.FieldPath.documentId();
        
        // แยกดึง 3 กลุ่ม (ดึงพร้อมกัน) เพื่อให้ครอบคลุมทุกบิลโดยไม่หนักเครื่อง
        Promise.all([
          // กลุ่ม 1: ดึงบิลใหม่ล่าสุดจากแอป Thermal (เรียงตามเวลาสร้าง)
          db.collection("bills").orderBy("createdAt", "desc").limit(1500).get().catch(function(){ return {docs:[]}; }),
          
          // กลุ่ม 2: ดึงบิลที่มีการอัปเดตสถานะล่าสุด (เผื่อมีการแก้ไข)
          db.collection("bills").orderBy("updatedAt", "desc").limit(500).get().catch(function(){ return {docs:[]}; }),
          
          // กลุ่ม 3: ดึงบิลเก่าจาก Google Sheets (ที่ไม่มีเวลาสร้าง ให้เรียงตามเลขบิลย้อนหลัง)
          db.collection("bills").orderBy(docId, "desc").limit(1500).get().catch(function(){ return {docs:[]}; })
        ]).then(function(snaps) {
          var map = {};
          
          // นำข้อมูลทั้ง 3 กลุ่มมารวมกัน (ถ้าบิลซ้ำกัน จะถูกคัดออกอัตโนมัติ)
          snaps.forEach(function(snap){
            if(snap.forEach){
              snap.forEach(function(doc){
                var d = doc.data();
                if(d.billNo && !map[d.billNo]) map[d.billNo] = d;
              });
            }
          });
          
          var bills = Object.values(map);
          
          // จัดเรียงวันที่ใหม่ล่าสุดขึ้นก่อนสุด
          bills.sort(function(a, b) {
            var parseDate = function(v) {
              if (!v) return 0;
              var str = String(v);
              if (str.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(str).getTime();
              if (str.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
                 var p = str.split("/");
                 var y = parseInt(p[2]);
                 if (y > 2400) y -= 543;
                 return new Date(y, parseInt(p[1])-1, parseInt(p[0])).getTime();
              }
              var fb = new Date(str).getTime();
              return isNaN(fb) ? 0 : fb;
            };
            
            var tA = a.createdAt ? new Date(a.createdAt).getTime() : parseDate(a.date);
            var tB = b.createdAt ? new Date(b.createdAt).getTime() : parseDate(b.date);
            
            if(tA === tB) return (b.billNo || "") > (a.billNo || "") ? 1 : -1;
            return tB - tA;
          });
          
          resolve(bills);
        }).catch(function(err){
          console.warn("[GolodDB] Error fetching bills:", err);
          resolve([]);
        });
      });
    });
  }