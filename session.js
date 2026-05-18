// ===== โกโลด ทรานสปอร์ต — Session Manager =====

var GolodSession = {

  save: function(user, system) {
    var data = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      branch: user.branch,
      avatar: user.avatar,
      system: system,
      perms: user.perms,
      reportPerms: user.reportPerms,
      loginAt: new Date().toISOString(),
      expireAt: new Date(Date.now() + 30*24*60*60*1000).toISOString() // 30 วัน
    };
    localStorage.setItem("golod_session", JSON.stringify(data));
  },

  get: function() {
    try {
      var raw = localStorage.getItem("golod_session");
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (new Date(data.expireAt) < new Date()) { this.clear(); return null; }
      return data;
    } catch(e) { return null; }
  },

  clear: function() {
    localStorage.removeItem("golod_session");
  },

  // ===== KEY FIX: Admin/branch ไม่บังคับ perm — เข้าได้ทุกระบบ =====
  require: function(requiredSystem, requiredPerm) {
    var s = this.get();
    if (!s) {
      localStorage.setItem("golod_redirect", window.location.href);
      window.location.href = "GolodApp.html"; // redirect ไป GolodApp ไม่ใช่ AuthSystem
      return null;
    }
    // admin และ branch เข้าได้ทุกระบบ ไม่ต้องตรวจ perm
    if (s.role === "admin" || s.role === "branch") return s;
    // role อื่น ตรวจ perm
    if (requiredPerm) {
      if (!s.perms || !s.perms[requiredPerm]) {
        alert("ไม่มีสิทธิ์เข้าระบบนี้ครับ กรุณาติดต่อ Admin");
        window.location.href = "GolodApp.html";
        return null;
      }
    }
    return s;
  },

  renderTopbar: function(containerId, systemName, systemColor) {
    var s = this.get();
    if (!s) return;
    var el = document.getElementById(containerId);
    if (!el) return;
    var roleLabels = {admin:"แอดมิน",branch:"หัวหน้าสาขา",clerk:"เสมียน",driver:"คนขับ",customer:"ลูกค้า"};
    el.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">' +
      '<div style="font-size:11px;color:#9FE1CB;background:rgba(255,255,255,.15);padding:3px 10px;border-radius:20px">' + (systemName||"") + '</div>' +
      '<div style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.15);padding:4px 10px;border-radius:20px">' +
      '<div style="width:24px;height:24px;border-radius:50%;background:'+(systemColor||"#1D9E75")+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">' + s.avatar + '</div>' +
      '<div><div style="font-size:11px;color:#fff;font-weight:500">' + s.name.split(" ")[0] + '</div>' +
      '<div style="font-size:10px;color:#9FE1CB">' + (roleLabels[s.role]||s.role) + ' · ' + s.branch + '</div></div></div>' +
      '<a href="GolodApp.html" style="font-size:11px;color:#9FE1CB;background:rgba(255,255,255,.15);padding:4px 10px;border-radius:20px;text-decoration:none">← หน้าหลัก</a>' +
      '<button onclick="GolodSession.logout()" style="padding:4px 10px;background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:20px;font-size:11px;cursor:pointer">ออก</button>' +
      '</div>';
  },

  logout: function() {
    this.clear();
    window.location.href = "GolodApp.html";
  }
};
