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
      try { db.settings({ experimentalAutoDetectLongPolling: true, merge: true }); } catch(e) {}
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

  function getBillsByTripId(tripId) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("bills").where("tripId", "==", tripId).get()
          .then(function(snap) {
            var out = [];
            snap.forEach(function(d) { var x = d.data() || {}; x._id = d.id; out.push(x); });
            resolve(out);
          }).catch(reject);
      });
    });
  }
  function findTripsWithBill(billNo) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("trips").where("billIds", "array-contains", billNo).get()
          .then(function(snap) {
            var out = [];
            snap.forEach(function(d) { var x = d.data() || {}; x._id = d.id; out.push(x); });
            resolve(out);
          }).catch(reject);
      });
    });
  }
  function removeBillFromTrip(tripId, billNo) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("trips").doc(tripId).update({
          billIds: firebase.firestore.FieldValue.arrayRemove(billNo)
        }).then(resolve).catch(reject);
      });
    });
  }
  function findBillDocs(billNo) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("bills").where("billNo", "==", billNo).get()
          .then(function(snap) {
            var out = [];
            snap.forEach(function(d) { var x = d.data() || {}; x._id = d.id; out.push(x); });
            resolve(out);
          }).catch(reject);
      });
    });
  }
  function deleteBillDoc(docId) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("bills").doc(docId).delete().then(resolve).catch(reject);
      });
    });
  }
  function updateBillDoc(docId, updates) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("bills").doc(docId).update(updates).then(resolve).catch(reject);
      });
    });
  }
  function _updBillLocal(billNo, updates) {
    try {
      var bills = JSON.parse(localStorage.getItem("golod_bills") || "[]");
      var idx = bills.findIndex(function(b){ return b.billNo === billNo; });
      if (idx >= 0) { bills[idx] = Object.assign({}, bills[idx], updates); localStorage.setItem("golod_bills", JSON.stringify(bills)); }
    } catch(e) {}
  }
  function updateBill(billNo, updates) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        var col = db.collection("bills");
        // 1) ลองอัปเดตที่ doc id = เลขบิล (กรณีปกติ บิลจากเสมียน)
        col.doc(billNo).update(updates)
          .then(function() { _updBillLocal(billNo, updates); resolve(); })
          .catch(function(err) {
            // 2) doc id ไม่ตรงกับเลขบิล (บิลที่บันทึกด้วย auto-id, billNo เป็น field) → หาด้วย field แล้วอัปเดต
            col.where("billNo", "==", billNo).limit(1).get()
              .then(function(snap) {
                if (snap && !snap.empty) {
                  return snap.docs[0].ref.update(updates)
                    .then(function() { _updBillLocal(billNo, updates); resolve(); });
                }
                reject(err); // ไม่พบบิลนี้จริงๆ ส่ง error เดิมกลับ
              })
              .catch(reject);
          });
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

  function getEditLogs(opts) {
    opts = opts || {};
    return new Promise(function(resolve) {
      ready(function() {
        db.collection("editLogs").orderBy("editedAt", "desc").limit(opts.limitN || 300).get()
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

  // ฟังก์ชัน sort+filter กลาง
  function _sortAndFilter(bills){
    var parseDate = function(v) {
      if (!v) return 0;
      var str = String(v);
      if (str.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(str).getTime();
      if (str.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
        var p = str.split("/");
        var y = parseInt(p[2]); if (y > 2400) y -= 543;
        return new Date(y, parseInt(p[1])-1, parseInt(p[0])).getTime();
      }
      return isNaN(new Date(str).getTime()) ? 0 : new Date(str).getTime();
    };
    bills.sort(function(a,b){
      var tA = a.createdAt ? new Date(a.createdAt).getTime() : parseDate(a.date);
      var tB = b.createdAt ? new Date(b.createdAt).getTime() : parseDate(b.date);
      return tB - tA;
    });
    // filter เฉพาะบิลที่มี billNo (DR- บิลไม่มี senderName แต่ต้องผ่าน)
    return bills.filter(function(b){
      if(!b.billNo) return false;
      // บิลคนรถออกเอง (DR-) ไม่มี senderName ให้ผ่านได้
      if(b.clerkCode==="DR" || (b.billNo||"").indexOf("DR")===0) return true;
      var sn = b.senderName || (b.form && b.form.senderName) || "";
      return sn.trim() !== "";
    });
  }

  // getBillsNew — ใช้กับ SalesReport / หน้าที่ต้องการข้อมูลย้อนหลังเยอะ
  function getBillsNew(limitN) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("bills").orderBy("createdAt","desc").limit(limitN || 3000).get()
          .then(function(snap) {
            var bills = [];
            snap.forEach(function(doc) { bills.push(doc.data()); });
            resolve(_sortAndFilter(bills));
          }).catch(reject);
      });
    });
  }

  // getBillsDispatch — optimized: active ก่อน แล้ว recent done แยก
  function getBillsDispatch(opts) {
    opts = opts || {};
    var days = opts.days || 7; // ลดจาก 14 → 7 วัน
    return new Promise(function(resolve, reject) {
      ready(function() {
        var cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        var cutoffISO = cutoff.toISOString();

        // Query 1: บิล active ทุกสถานะ — ไม่จำกัดวัน ดึงทั้งหมด
        var ACTIVE_ST = [
          "กำลังวิ่งส่งลูกค้า","ระหว่างนำส่งสาขา","ออกบิลรับของ","นำส่งใหม่",
          "issued","ติดต่อลูกค้าไม่ได้","ติดต่อไม่ได้","nocontact","reschedule","นัดส่งใหม่",
          "ส่งไม่สำเร็จ","รออนุมัติ"
        ];
        var activeQueries = ACTIVE_ST.map(function(st){
          return db.collection("bills").where("status","==",st).limit(500).get()
            .catch(function(e){ console.warn("[getBillsDispatch] query fail:", st, e.message); return {forEach:function(){}}; });
        });
        // บิล status ว่าง (issued ใหม่)
        var emptyQ = db.collection("bills").where("status","==","").limit(50).get();

        // Query 2: done ภายใน N วัน (limit เล็กลง)
        var doneQ = db.collection("bills")
          .where("createdAt", ">=", cutoffISO)
          .orderBy("createdAt", "desc")
          .limit(200);

        Promise.all(activeQueries.concat([emptyQ, doneQ.get()]))
          .then(function(results) {
            var seen = {}, bills = [];
            results.forEach(function(snap){
              if(!snap || !snap.forEach) return;
              snap.forEach(function(doc){
                var d = doc.data();
                if(d.billNo && !seen[d.billNo]){
                  seen[d.billNo] = true;
                  bills.push(d);
                }
              });
            });
            resolve(_sortAndFilter(bills));
          }).catch(function(e){
            console.warn("[getBillsDispatch] fallback:", e.message);
            // fallback: ดึงแค่ active
            var ACTIVE_ST2 = ["กำลังวิ่งส่งลูกค้า","ระหว่างนำส่งสาขา","ออกบิลรับของ"];
            Promise.all(ACTIVE_ST2.map(function(st){
              return db.collection("bills").where("status","==",st).limit(150).get();
            })).then(function(snaps){
              var seen={}, bills=[];
              snaps.forEach(function(snap){
                snap.forEach(function(doc){
                  var d=doc.data();
                  if(!seen[d.billNo]){seen[d.billNo]=true;bills.push(d);}
                });
              });
              resolve(_sortAndFilter(bills));
            }).catch(reject);
          });
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

  // ===== TRIPS =====
  // collection: trips
  // doc: { id, driverUsername, driverName, branch, route, departDate, days,
  //         baseFare, fuelDist, fuelPrice, fuelRate, fuelAdvance, odomStart,
  //         extras:{overweight,openTail,longLoad,overHeight},
  //         note, billIds:[], status:"open"|"closed",
  //         createdAt, createdBy,
  //         summary:{billCount,destTotal,codTotal,pickupCount} }

  function saveTrip(trip) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        var ref = trip.id
          ? db.collection("trips").doc(trip.id)
          : db.collection("trips").doc();
        if(!trip.id) trip.id = ref.id;
        trip.updatedAt = new Date().toISOString();
        // ป้องกัน undefined fields ที่ Firestore ไม่รองรับ
        if(!trip.createdAt) trip.createdAt = new Date().toISOString();
        // ลบ fields ที่เป็น undefined ออก
        Object.keys(trip).forEach(function(k){
          if(trip[k]===undefined) delete trip[k];
        });
        ref.set(trip, {merge:true})
          .then(function(){ resolve(trip); })
          .catch(reject);
      });
    });
  }

  function getTrips(opts) {
    opts = opts || {};
    return new Promise(function(resolve, reject) {
      ready(function() {
        var q = db.collection("trips").orderBy("createdAt","desc").limit(opts.limitN||200);
        if(opts.driverUsername){
          q = db.collection("trips")
            .where("driverUsername","==",opts.driverUsername)
            .orderBy("createdAt","desc").limit(opts.limitN||100);
        }
        q.get().then(function(snap){
          var trips=[];
          snap.forEach(function(doc){ trips.push(doc.data()); });
          if(opts.dateFrom||opts.dateTo){
            trips=trips.filter(function(t){
              var d=t.departDate||t.createdAt&&t.createdAt.slice(0,10)||"";
              if(opts.dateFrom&&d<opts.dateFrom) return false;
              if(opts.dateTo&&d>opts.dateTo)   return false;
              return true;
            });
          }
          resolve(trips);
        }).catch(reject);
      });
    });
  }

  function updateTrip(tripId, updates) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        updates.updatedAt = new Date().toISOString();
        db.collection("trips").doc(tripId).update(updates)
          .then(resolve).catch(reject);
      });
    });
  }

  // เพิ่ม tripId ลงในหลาย bills พร้อมกัน
  function assignBillsToTrip(billNos, tripId) {
    var promises = billNos.map(function(billNo){
      return updateBill(billNo, {tripId: tripId});
    });
    return Promise.all(promises);
  }

  // ===== SETTINGS =====
  function saveSetting(key, value){
    return new Promise(function(resolve,reject){
      ready(function(){
        db.collection("settings").doc(key).set({value:value, updatedAt:new Date().toISOString()})
          .then(resolve).catch(reject);
      });
    });
  }
  function getSetting(key){
    return new Promise(function(resolve,reject){
      ready(function(){
        db.collection("settings").doc(key).get()
          .then(function(doc){ resolve(doc.exists?doc.data().value:null); })
          .catch(reject);
      });
    });
  }

  // ===== PICKUPS (งานรับล่วงหน้า) =====
  function savePickup(rec) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        try {
          var col = db.collection("pickups");
          if (rec && rec.id) {
            var id = rec.id;
            var data = Object.assign({}, rec); delete data.id;
            data.updatedAt = new Date().toISOString();
            col.doc(id).set(data, { merge: true })
              .then(function(){ resolve(Object.assign({ id: id }, data)); })
              .catch(reject);
          } else {
            var data2 = Object.assign({}, rec); delete data2.id;
            if (!data2.createdAt) data2.createdAt = new Date().toISOString();
            col.add(data2)
              .then(function(refDoc){ resolve(Object.assign({ id: refDoc.id }, data2)); })
              .catch(reject);
          }
        } catch(e){ reject(e); }
      });
    });
  }

  function getPickups(opts) {
    opts = opts || {};
    var limitN = opts.limitN || 400;
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("pickups").limit(limitN).get()
          .then(function(snap) {
            var list = [];
            snap.forEach(function(doc) { list.push(Object.assign({ id: doc.id }, doc.data())); });
            list.sort(function(a,b){
              var ta = a.createdAt || a.pickupDate || "";
              var tb = b.createdAt || b.pickupDate || "";
              return String(tb).localeCompare(String(ta));
            });
            resolve(list);
          }).catch(reject);
      });
    });
  }

  function updatePickup(id, updates) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("pickups").doc(id).update(updates)
          .then(function(){ resolve(true); }).catch(reject);
      });
    });
  }

  function deletePickup(id) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("pickups").doc(id).delete()
          .then(function(){ resolve(true); }).catch(reject);
      });
    });
  }

  // ===== CUSTOMER / COD ACCOUNTS (อ่านรายชื่อลูกค้า + รหัส + เรทพิเศษ) =====
  function getCodAccounts() {
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("codAccounts").limit(3000).get()
          .then(function(snap) {
            var list = [];
            snap.forEach(function(doc) { list.push(Object.assign({ _id: doc.id }, doc.data())); });
            resolve(list);
          }).catch(reject);
      });
    });
  }

  // ===== RECEIPTS (ใบเสร็จ — cross-device + คิวอนุมัติ) =====
  function saveReceipt(rcpt) {
    return new Promise(function(resolve, reject) {
      ready(function() {
        db.collection("receipts").doc(rcpt.receiptNo).set(rcpt, {merge:true})
          .then(function() {
            try {
              var rs = JSON.parse(localStorage.getItem("golod_receipts") || "[]");
              var i = rs.findIndex(function(r){ return r.receiptNo === rcpt.receiptNo; });
              if (i >= 0) rs[i] = rcpt; else rs.unshift(rcpt);
              localStorage.setItem("golod_receipts", JSON.stringify(rs));
            } catch(e) {}
            resolve(rcpt);
          }).catch(reject);
      });
    });
  }
  function getReceipts(opts) {
    opts = opts || {};
    return new Promise(function(resolve) {
      ready(function() {
        db.collection("receipts").limit(opts.limitN || 2000).get()
          .then(function(snap) {
            var rs = []; snap.forEach(function(d){ rs.push(d.data()); });
            rs.sort(function(a,b){ return String(b.createdAt||b.receiptNo||"").localeCompare(String(a.createdAt||a.receiptNo||"")); });
            try { localStorage.setItem("golod_receipts", JSON.stringify(rs)); } catch(e) {}
            resolve(rs);
          }).catch(function(e) {
            console.warn("getReceipts:", e && e.message);
            try { resolve(JSON.parse(localStorage.getItem("golod_receipts") || "[]")); } catch(_) { resolve([]); }
          });
      });
    });
  }

  return {
    init, ready,
    saveBill, getBills, updateBill,
    findBillDocs, deleteBillDoc, updateBillDoc,
    findTripsWithBill, removeBillFromTrip,
    getBillsByTripId,
    saveContact, getContacts,
    saveUser, getUsers,
    saveEditLog, getEditLogs,
    listenBills, getAllBills, getBillsNew,
    saveDispatchLog, getDispatchLogs,
    getBillsDispatch,
    saveTrip, getTrips, updateTrip, assignBillsToTrip,
    savePickup, getPickups, updatePickup, deletePickup,
    saveReceipt, getReceipts,
    getCodAccounts,
    saveSetting, getSetting
  };
})();
