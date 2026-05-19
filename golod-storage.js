// ===== GOLOD STORAGE SERVICE =====
// ใช้ Firebase Storage SDK (compat) แทน REST API เพื่อหลีกเลี่ยง CORS

var GolodStorage = (function() {
  var BUCKET = "status-81cd0.firebasestorage.app";

  function getStorage() {
    try {
      return firebase.storage();
    } catch(e) {
      console.warn("Firebase Storage not ready:", e.message);
      return null;
    }
  }

  // อัปโหลดไฟล์ไปยัง Firebase Storage
  function uploadFile(path, file) {
    return new Promise(function(resolve, reject) {
      var storage = getStorage();
      if (!storage) { reject(new Error("Storage not ready")); return; }
      var ref = storage.ref(path);
      var task = ref.put(file);
      task.then(function(snapshot) {
        return snapshot.ref.getDownloadURL();
      }).then(function(url) {
        resolve(url);
      }).catch(reject);
    });
  }

  // อัปโหลดสลิปสำหรับบิล
  function uploadSlip(billNo, file, slotName) {
    var ext = (file.name||"img").split(".").pop() || "jpg";
    var path = "slips/" + billNo + "/" + (slotName||"slip1") + "." + ext;
    return uploadFile(path, file);
  }

  // บันทึก URL ลง Firestore
  function saveSlipUrl(billNo, slotName, url) {
    if (typeof GolodDB === "undefined") return Promise.resolve();
    var upd = {};
    upd[slotName] = url;
    return GolodDB.updateBill(billNo, upd);
  }

  // อัปโหลดและบันทึก URL
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
