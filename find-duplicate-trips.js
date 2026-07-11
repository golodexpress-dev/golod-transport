/* =====================================================================
   GOLOD — หาเที่ยวซ้ำ (บิลใบเดียวกันอยู่หลายเที่ยว)
   ---------------------------------------------------------------------
   ตรวจทุกเที่ยวที่ยังไม่ปิด (open/proposed) แล้วหาว่ามีบิลใบไหน
   ไปโผล่ในมากกว่า 1 เที่ยว — เที่ยวที่ค่าเที่ยว(baseFare)=0 มักเป็นตัวซ้ำ

   วิธีใช้:
     1. เปิด DispatchApp.html ด้วยบัญชี admin
     2. F12 → Console → วางไฟล์นี้ → Enter
     3. อ่านตารางที่ขึ้นมา — ยังไม่ลบอะไร
     4. ลบเที่ยวซ้ำผ่านปุ่มในแอป (คลิกแถว → หน้าเคลียร์ → 🗑 ลบเที่ยว)
        หรือถ้ามั่นใจ พิมพ์  GOLOD_DUP.remove("<tripId>")  ลบทีละใบ
        (ถอดบิลกลับคลังให้อัตโนมัติ ไม่ลบตัวบิล)
   ===================================================================== */
(function () {
  var db;
  try { db = firebase.firestore(); }
  catch (e) { console.error("❌ เปิด DispatchApp ก่อน"); return; }

  function scan() {
    return db.collection("trips").get().then(function (snap) {
      var trips = [];
      snap.forEach(function (d) {
        var t = d.data(); t._id = d.id;
        var st = String((t.settlement && t.settlement.status) || t.status || "").toLowerCase();
        if (st === "closed" || st === "cancelled") return;
        trips.push(t);
      });

      // bill -> [เที่ยวที่มีบิลนี้]
      var billMap = {};
      trips.forEach(function (t) {
        (t.billIds || []).forEach(function (bn) {
          (billMap[bn] = billMap[bn] || []).push(t);
        });
      });

      // เที่ยวที่มีบิลชนกับเที่ยวอื่น
      var flagged = {};
      Object.keys(billMap).forEach(function (bn) {
        if (billMap[bn].length > 1) {
          billMap[bn].forEach(function (t) {
            flagged[t._id] = flagged[t._id] || { trip: t, sharedBills: 0 };
            flagged[t._id].sharedBills++;
          });
        }
      });

      return { flagged: Object.values(flagged), billMap: billMap };
    });
  }

  function report(res) {
    var rows = res.flagged;
    if (!rows.length) { console.log("✅ ไม่พบเที่ยวซ้ำ"); return res; }

    console.log("%c พบเที่ยวที่บิลชนกัน " + rows.length + " เที่ยว",
      "background:#c0392b;color:#fff;padding:4px 10px;border-radius:4px;font-weight:700");
    console.table(rows.map(function (r) {
      var t = r.trip;
      return {
        tripId: t._id,
        คนขับ: t.driverName || t.driverUsername || "-",
        วันออก: t.departDate || "-",
        เส้นทาง: t.route || "(ไม่ระบุ)",
        บิล: (t.billIds || []).length,
        บิลที่ชน: r.sharedBills,
        ค่าเที่ยว: t.baseFare || 0,
        "น่าจะซ้ำ?": (parseFloat(t.baseFare || 0) === 0) ? "🚩 ใช่" : ""
      };
    }));
    console.log("%c ลบผ่านปุ่มในแอป หรือ  GOLOD_DUP.remove(\"tripId\")  ทีละใบ",
      "background:#0F6E56;color:#fff;padding:4px 10px;border-radius:4px");
    return res;
  }

  function remove(tripId) {
    if (!tripId) { console.error("ใส่ tripId ด้วย"); return; }
    return db.collection("trips").doc(tripId).get().then(function (doc) {
      if (!doc.exists) { console.error("ไม่พบเที่ยว " + tripId); return; }
      var t = doc.data();
      var bills = (t.billIds || []).slice();
      console.log("กำลังถอด " + bills.length + " บิลกลับคลัง (ไม่ลบตัวบิล)...");
      var chain = Promise.resolve();
      bills.forEach(function (bn) {
        chain = chain.then(function () {
          return db.collection("trips").doc(tripId).update({
            billIds: firebase.firestore.FieldValue.arrayRemove(bn)
          }).catch(function () {});
        });
      });
      return chain.then(function () {
        return db.collection("trips").doc(tripId).delete();
      }).then(function () {
        console.log("%c ✅ ลบเที่ยวซ้ำ " + tripId + " แล้ว — รีเฟรชหน้าเพื่อดูผล",
          "background:#0F6E56;color:#fff;padding:4px 10px;border-radius:4px;font-weight:700");
      });
    });
  }

  window.GOLOD_DUP = { scan: function () { return scan().then(report); }, remove: remove };

  console.log("%c GOLOD หาเที่ยวซ้ำ",
    "background:#34495e;color:#fff;padding:4px 10px;border-radius:4px;font-weight:700");
  scan().then(report);
})();
