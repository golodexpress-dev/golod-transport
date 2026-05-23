// ===== GOLOD FIREBASE SERVICE =====
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

  function init() {
    try {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
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

  // ===== BILLS =====
  function saveBill(bill) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("bills").doc(bill.billNo).set(bill)
          .then(function() {
            try {
              var bills = JSON.parse(localStorage.getItem("golod_bills") || "[]");
              var idx = bills.findIndex(function(b) { return b.billNo === bill.billNo; });
              if (idx >= 0) bills[idx] = bill; else bills.unshift(bill);
              localStorage.setItem("golod_bills", JSON.stringify(bills));
            } catch(e) {}
            resolve(bill);
          }).catch(reject);
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
            try {
              if (isAdmin) {
                localStorage.setItem("golod_bills", JSON.stringify(bills));
              } else {
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
        db.collection("bills").limit(limitN||5000).get()
          .then(function(snap) {
            var bills=[];
            snap.forEach(function(doc){ bills.push(doc.data()); });
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

  function getBillsNew(limitN) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("bills").limit(limitN || 8000).get().then(function(snap) {
          var bills = [];
          snap.forEach(function(doc) { bills.push(doc.data()); });
          bills.sort(function(a, b) {
            var parseDate = function(v) {
              if (!v) return 0;
              var str = String(v);
              if (str.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(str).getTime();
              if (str.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
                var p = str.split("/");
                var y = parseInt(p[2]); if (y > 2400) y -= 543;
                return new Date(y, parseInt(p[1])-1, parseInt(p[0])).getTime();
              }
              var fallback = new Date(str).getTime();
              return isNaN(fallback) ? 0 : fallback;
            };
            var tA = a.createdAt ? new Date(a.createdAt).getTime() : parseDate(a.date);
            var tB = b.createdAt ? new Date(b.createdAt).getTime() : parseDate(b.date);
            return tB - tA;
          });
          // FIX: senderName อาจอยู่ใน root หรือใน form.senderName ก็ได้
          var newBills = bills.filter(function(b){
            var sn = b.senderName || (b.form && b.form.senderName) || "";
            return sn.trim() !== "";
          });
          resolve(newBills);
        }).catch(reject);
      });
    });
  }

  // ===================================================
  // ===== DISPATCH LOGS (ใหม่) =====
  // collection: dispatchLogs
  // doc structure:
  //   id        : auto
  //   dispatchAt: ISO string
  //   dispatchBy: username ของคนกดจ่าย
  //   mode      : "driver" | "branch"
  //   targetId  : username หรือ branch id
  //   targetName: ชื่อคนขับหรือสาขา
  //   billCount : จำนวนบิล
  //   totalFreight : ยอดค่าขนส่งรวม
  //   totalOrigin  : ยอดต้นทาง
  //   totalDest    : ยอดปลายทาง
  //   totalTransfer: ยอดโอน
  //   totalCredit  : ยอดเครดิต
  //   totalCOD     : ยอด COD
  //   bills     : array ของ {billNo, receiverName, destProv, freightNet, codTotal, freightPay}
  // ===================================================

  function saveDispatchLog(log) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("dispatchLogs").add(log)
          .then(function(ref) {
            resolve(ref.id);
          }).catch(reject);
      });
    });
  }

  function getDispatchLogs(opts) {
    // opts: { limitN, targetId, mode, dateFrom, dateTo }
    opts = opts || {};
    return new Promise(function(resolve, reject) {
      ready(function() {
        var q = db.collection("dispatchLogs").orderBy("dispatchAt", "desc");

        if(opts.targetId) {
          q = db.collection("dispatchLogs")
            .where("targetId","==",opts.targetId)
            .orderBy("dispatchAt","desc");
        }
        if(opts.mode && !opts.targetId) {
          q = db.collection("dispatchLogs")
            .where("mode","==",opts.mode)
            .orderBy("dispatchAt","desc");
        }

        q.limit(opts.limitN || 200).get()
          .then(function(snap) {
            var logs = [];
            snap.forEach(function(doc) {
              var d = doc.data();
              d._docId = doc.id;
              logs.push(d);
            });
            // filter by date client-side (Firestore ไม่ต้องการ composite index เพิ่ม)
            if(opts.dateFrom || opts.dateTo) {
              logs = logs.filter(function(l) {
                var d = l.dispatchAt ? l.dispatchAt.slice(0,10) : "";
                if(opts.dateFrom && d < opts.dateFrom) return false;
                if(opts.dateTo   && d > opts.dateTo)   return false;
                return true;
              });
            }
            resolve(logs);
          }).catch(reject);
      });
    });
  }

  return {
    init, saveBill, getBills, updateBill,
    saveContact, getContacts,
    saveUser, getUsers,
    saveEditLog, getEditLogs,
    listenBills, getAllBills, getBillsNew,
    saveDispatchLog, getDispatchLogs
  };
})();
