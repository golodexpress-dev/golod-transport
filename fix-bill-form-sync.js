/* =====================================================================
   GOLOD — Repair: form.* ไม่ตรงกับ top-level (บิลคนขับที่เสมียนอนุมัติ)
   ---------------------------------------------------------------------
   ปัญหา: confirmApprove() เขียนแค่ top-level ไม่แตะ form.*
          → ระบบการเงินเห็น "โอน" แต่บิลที่พิมพ์ออกมาเป็น "ปลายทาง"
          → คนขับไปเก็บเงินซ้ำกับผู้รับ

   หลังรัน: form.freightPay / form.receiverAmphoe / form.receiverTambon /
            form.receiverAddr / form.receiverName / form.receiverPhone /
            form.destProv  ถูก sync ให้ตรงกับ top-level

   วิธีใช้:
     1. เปิด https://status-81cd0.web.app/DispatchApp.html ด้วยบัญชี admin
     2. F12 → Console → วางไฟล์นี้ทั้งไฟล์ → Enter
     3. อ่านตารางที่ขึ้นมา (DRY RUN — ยังไม่เขียน)
     4. พิมพ์  GOLOD_FIX_PAY.run()  เพื่อเขียนจริง
   ===================================================================== */
(function () {
  var db;
  try { db = firebase.firestore(); }
  catch (e) { console.error("❌ Firestore ไม่พร้อม — เปิดหน้า DispatchApp ก่อน"); return; }

  // top-level field  ->  form field(s) ที่ต้องตรงกัน
  var MAP = {
    freightPay:    ["freightPay"],
    destProv:      ["destProv"],
    destAmphoe:    ["destAmphoe", "receiverAmphoe"],
    destTambon:    ["destTambon", "receiverTambon"],
    destAddr:      ["destAddr", "receiverAddr"],
    receiverName:  ["receiverName"],
    receiverPhone: ["receiverPhone"],
    senderName:    ["senderName"],
    senderPhone:   ["senderPhone"]
  };

  function scan() {
    // จำกัดที่บิลคนขับ — บิลเสมียนสร้างจาก ThermalBill โดยตรง form ตรงอยู่แล้ว
    return db.collection("bills").where("isDriverBill", "==", true).get().then(function (snap) {
      var targets = [];
      snap.forEach(function (doc) {
        var b = doc.data();
        var form = b.form || {};
        var upd = {}, diffs = [];
        Object.keys(MAP).forEach(function (topKey) {
          var topVal = b[topKey];
          if (topVal === undefined || topVal === null || topVal === "") return;
          MAP[topKey].forEach(function (formKey) {
            if (form[formKey] !== topVal) {
              upd["form." + formKey] = topVal;
              if (formKey === "freightPay" || formKey === "receiverAmphoe") {
                diffs.push(formKey + ": " + JSON.stringify(form[formKey]) + " → " + JSON.stringify(topVal));
              }
            }
          });
        });
        if (Object.keys(upd).length) {
          targets.push({
            ref: doc.ref, billNo: b.billNo || doc.id,
            driver: b.driverName || "",
            topPay: b.freightPay || "", formPay: form.freightPay || "",
            fields: Object.keys(upd).length,
            key: diffs.join(" | "),
            upd: upd
          });
        }
      });
      return targets;
    });
  }

  function report(targets) {
    console.log("%c บิลที่ข้อมูล 2 ชั้นไม่ตรงกัน: " + targets.length + " ใบ",
      "background:#EF9F27;color:#fff;padding:4px 10px;border-radius:4px;font-weight:700");

    var payMismatch = targets.filter(function (t) { return t.topPay && t.formPay && t.topPay !== t.formPay; });
    if (payMismatch.length) {
      console.log("%c 🚨 วิธีชำระไม่ตรง " + payMismatch.length + " ใบ — คนขับอาจเก็บเงินซ้ำ",
        "background:#c0392b;color:#fff;padding:4px 10px;border-radius:4px;font-weight:700");
      console.table(payMismatch.map(function (t) {
        return { เลขบิล: t.billNo, คนขับ: t.driver, "ระบบการเงิน": t.topPay, "บิลที่พิมพ์": t.formPay };
      }));
    }
    if (targets.length) {
      console.table(targets.map(function (t) {
        return { เลขบิล: t.billNo, "ฟิลด์ที่ต้องแก้": t.fields, รายละเอียด: t.key || "(ที่อยู่/ชื่อ)" };
      }));
      console.log("%c พิมพ์  GOLOD_FIX_PAY.run()  เพื่อเขียนจริง",
        "background:#0F6E56;color:#fff;padding:4px 10px;border-radius:4px");
    }
    return targets;
  }

  function commit(targets) {
    if (!targets.length) { console.log("✅ ไม่มีอะไรต้องแก้"); return Promise.resolve(0); }
    var chunks = [], size = 400;
    for (var i = 0; i < targets.length; i += size) chunks.push(targets.slice(i, i + size));

    return chunks.reduce(function (chain, chunk) {
      return chain.then(function (done) {
        var batch = db.batch();
        chunk.forEach(function (t) {
          t.upd.formSyncedAt = new Date().toISOString();
          batch.update(t.ref, t.upd);
        });
        return batch.commit().then(function () {
          console.log("  ✓ เขียนแล้ว " + (done + chunk.length) + "/" + targets.length);
          return done + chunk.length;
        });
      });
    }, Promise.resolve(0)).then(function (n) {
      console.log("%c ✅ เสร็จสิ้น " + n + " ใบ — ลองพิมพ์บิลใหม่ดูได้เลย",
        "background:#0F6E56;color:#fff;padding:4px 10px;border-radius:4px;font-weight:700");
      return n;
    });
  }

  window.GOLOD_FIX_PAY = {
    scan: function () { return scan().then(report); },
    run:  function () { return scan().then(commit); }
  };

  console.log("%c GOLOD Repair: form vs top-level (DRY RUN)",
    "background:#34495e;color:#fff;padding:4px 10px;border-radius:4px;font-weight:700");
  scan().then(report);
})();
