/* =====================================================================
   GOLOD — Migration: แยก status (งาน) ออกจาก clearedAt (เงิน)
   ---------------------------------------------------------------------
   ปัญหา: เดิม trips เขียน status:"cleared" ทับ status:"open"
          ทำให้ DriverApp มองว่าเที่ยวจบแล้ว → หายจากหน้าคนขับ

   หลังรัน:
     status:"cleared"  →  status:"open" + clearedAt/clearedBy (จาก clearData)
     เที่ยวอื่นๆ         →  ไม่แตะ

   วิธีใช้:
     1. เปิด https://status-81cd0.web.app/DispatchApp.html ด้วยบัญชี admin
     2. กด F12 → แท็บ Console
     3. วางไฟล์นี้ทั้งไฟล์ → Enter
     4. อ่านผลลัพธ์ แล้วพิมพ์  GOLOD_MIGRATE.run()  เพื่อเขียนจริง

   ค่าเริ่มต้นเป็น DRY RUN (แค่ดู ไม่เขียน) — ปลอดภัย
   ===================================================================== */
(function () {
  var db;
  try { db = firebase.firestore(); }
  catch (e) { console.error("❌ Firestore ไม่พร้อม — เปิดหน้า DispatchApp ก่อน"); return; }

  function scan() {
    return db.collection("trips").get().then(function (snap) {
      var targets = [];
      snap.forEach(function (doc) {
        var d = doc.data();
        if (String(d.status || "").toLowerCase() !== "cleared") return;
        var cd = d.clearData || {};
        targets.push({
          ref: doc.ref,
          id: doc.id,
          route: d.route || "(ไม่ระบุเส้นทาง)",
          departDate: d.departDate || "",
          driver: d.driverName || d.driverUsername || "",
          clearedAt: d.clearedAt || cd.clearedAt || d.updatedAt || new Date().toISOString(),
          clearedBy: d.clearedBy || cd.clearedBy || ""
        });
      });
      return targets;
    });
  }

  function report(targets) {
    console.log("%c พบเที่ยวที่ต้องแก้: " + targets.length + " รายการ",
      "background:#EF9F27;color:#fff;padding:4px 10px;border-radius:4px;font-weight:700");
    if (targets.length) {
      console.table(targets.map(function (t) {
        return { id: t.id, คนขับ: t.driver, เส้นทาง: t.route, วันออก: t.departDate, เคลียร์เมื่อ: t.clearedAt };
      }));
      console.log("%c พิมพ์  GOLOD_MIGRATE.run()  เพื่อเขียนจริง",
        "background:#0F6E56;color:#fff;padding:4px 10px;border-radius:4px");
    }
    return targets;
  }

  function commit(targets) {
    if (!targets.length) { console.log("✅ ไม่มีอะไรต้องแก้"); return Promise.resolve(0); }
    // Firestore batch จำกัด 500 ops — แบ่งเป็นก้อน
    var chunks = [], size = 400;
    for (var i = 0; i < targets.length; i += size) chunks.push(targets.slice(i, i + size));

    return chunks.reduce(function (chain, chunk) {
      return chain.then(function (done) {
        var batch = db.batch();
        chunk.forEach(function (t) {
          batch.update(t.ref, {
            status: "open",              // คืนสถานะงาน
            clearedAt: t.clearedAt,      // ย้ายข้อมูลเงินมาไว้ฟิลด์ของตัวเอง
            clearedBy: t.clearedBy,
            migratedAt: new Date().toISOString()
          });
        });
        return batch.commit().then(function () {
          console.log("  ✓ เขียนแล้ว " + (done + chunk.length) + "/" + targets.length);
          return done + chunk.length;
        });
      });
    }, Promise.resolve(0)).then(function (n) {
      console.log("%c ✅ เสร็จสิ้น " + n + " เที่ยว — รีเฟรช DriverApp เพื่อดูผล",
        "background:#0F6E56;color:#fff;padding:4px 10px;border-radius:4px;font-weight:700");
      return n;
    });
  }

  window.GOLOD_MIGRATE = {
    scan: function () { return scan().then(report); },
    run: function () { return scan().then(commit); }
  };

  console.log("%c GOLOD Migration พร้อมใช้งาน (DRY RUN)",
    "background:#34495e;color:#fff;padding:4px 10px;border-radius:4px;font-weight:700");
  scan().then(report);
})();
