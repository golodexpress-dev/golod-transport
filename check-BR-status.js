/* ============================================================
   เช็คว่าบิล BR เก็บ status เป็นอะไร (ทำไมไม่ขึ้นแท็บส่งสำเร็จ)
   ------------------------------------------------------------
   วิธีใช้: เปิด DispatchApp → F12 → Console → วาง → Enter
   ============================================================ */
(function () {
  var db;
  try { db = firebase.firestore(); }
  catch (e) { console.error("❌ เปิด DispatchApp ก่อน"); return; }

  console.log("%c กำลังดึงบิล BR ทั้งหมด...", "background:#0F6E56;color:#fff;padding:4px 10px;border-radius:4px;font-weight:700");

  // ดึงบิลที่ billNo ขึ้นต้น BR
  db.collection("bills").orderBy("billNo").startAt("BR").endAt("BR\uf8ff").limit(50).get()
    .then(function (snap) {
      if (snap.empty) {
        console.log("%c ❌ ไม่มีบิลที่ billNo ขึ้นต้น 'BR' เลย", "color:#c0392b;font-weight:700");
        console.log("   → เป็นไปได้ว่า billNo เก็บตัวเล็ก (br) หรือมีช่องว่างนำหน้า");
        // ลองตัวเล็ก
        return db.collection("bills").orderBy("billNo").startAt("br").endAt("br\uf8ff").limit(20).get()
          .then(function (s2) {
            if (!s2.empty) {
              console.log("%c ⚠️ เจอบิลขึ้นต้น 'br' (ตัวเล็ก)!", "color:#EF9F27;font-weight:700");
              s2.forEach(function (d) { console.log("   • '" + d.data().billNo + "' status:", JSON.stringify(d.data().status)); });
            }
          });
      }

      // นับ status แต่ละแบบ
      var statusCount = {};
      var samples = [];
      snap.forEach(function (doc) {
        var d = doc.data();
        var st = d.status;
        var key = JSON.stringify(st); // เห็นช่องว่าง/undefined ชัดๆ
        statusCount[key] = (statusCount[key] || 0) + 1;
        if (samples.length < 15) samples.push({ billNo: d.billNo, status: st, docId: doc.id });
      });

      console.log("%c พบบิล BR " + snap.size + " ใบ", "color:#0F6E56;font-weight:700");
      console.log("%c สรุป status ที่เจอ:", "font-weight:700");
      console.table(Object.keys(statusCount).map(function (k) {
        return { "status (มี quote = ค่าจริง)": k, "จำนวน": statusCount[k] };
      }));

      console.log("%c ตัวอย่างบิล BR:", "font-weight:700");
      console.table(samples);

      // เทียบกับ status ที่แท็บ done ดึง
      var DONE_ST = ["ส่งสำเร็จ","ส่งไม่สำเร็จ","นำกลับสาขา","ลูกค้ารับกลับ","delivered","success","ติดต่อลูกค้าไม่ได้","ติดต่อไม่ได้","nocontact"];
      console.log("%c แท็บส่งสำเร็จดึงเฉพาะ status เหล่านี้:", "font-weight:700", DONE_ST);
      var brDone = samples.filter(function (s) { return DONE_ST.indexOf(s.status) >= 0; });
      console.log("บิล BR ที่ status ตรงกับที่แท็บดึง:", brDone.length, "/", samples.length);
      if (brDone.length === 0) {
        console.log("%c 🎯 นี่คือสาเหตุ! status ของบิล BR ไม่ตรงกับที่แท็บ done ดึงเลย", "background:#c0392b;color:#fff;padding:3px 8px;border-radius:4px");
      }
    })
    .catch(function (e) { console.error("error:", e && e.message); });
})();
