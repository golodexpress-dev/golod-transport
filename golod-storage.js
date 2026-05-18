// ===== GOLOD STORAGE SERVICE =====
// อัปโหลดไฟล์ไปยัง Firebase Storage ผ่าน REST API (ไม่ต้องการ SDK เพิ่ม)

var GolodStorage = (function() {
  var BUCKET = "status-81cd0.firebasestorage.app";
  var API_KEY = "AIzaSyCwgIOP-fIe5v4VOpnn3oblVYzqIGsCpK0";

  // อัปโหลดไฟล์ไปยัง Firebase Storage
  // path: เส้นทางใน storage เช่น "slips/BA1805-01_slip.jpg"
  // file: File object
  // returns: Promise<string> URL ของไฟล์
  function uploadFile(path, file) {
    return new Promise(function(resolve, reject) {
      var encodedPath = encodeURIComponent(path);
      var url = "https://firebasestorage.googleapis.com/v0/b/" + BUCKET + "/o?uploadType=media&name=" + encodedPath;
      
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-Goog-Api-Key": API_KEY
        },
        body: file
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.error) { reject(new Error(data.error.message)); return; }
        // สร้าง download URL
        var downloadUrl = "https://firebasestorage.googleapis.com/v0/b/" + BUCKET + "/o/" + encodedPath + "?alt=media";
        resolve(downloadUrl);
      })
      .catch(reject);
    });
  }

  // อัปโหลดสลิปสำหรับบิล
  // billNo: เลขบิล, file: File object, slotName: ชื่อ slot เช่น "slip1"
  function uploadSlip(billNo, file, slotName) {
    var ext = file.name.split('.').pop() || 'jpg';
    var path = "slips/" + billNo + "/" + (slotName||"slip1") + "." + ext;
    return uploadFile(path, file);
  }

  // บันทึก slip URL ลง Firestore
  function saveSlipUrl(billNo, slotName, url) {
    if (typeof GolodDB === "undefined") return Promise.resolve();
    var upd = {}; upd[slotName] = url; return GolodDB.updateBill(billNo, upd);
  }

  // อัปโหลดและบันทึก URL ในขั้นตอนเดียว
  function uploadAndSave(billNo, file, slotName) {
    return uploadSlip(billNo, file, slotName||"slip1")
      .then(function(url) {
        return saveSlipUrl(billNo, slotName||"slip1", url)
          .then(function() { return url; });
      });
  }

  return {
    uploadFile: uploadFile,
    uploadSlip: uploadSlip,
    saveSlipUrl: saveSlipUrl,
    uploadAndSave: uploadAndSave
  };
})();
