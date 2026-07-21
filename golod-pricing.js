/* ============================================================
   golod-pricing.js  —  เครื่องคิดราคากลาง GOLOD Transport
   แกะจาก ThermalBill (build 2026-07-12) ให้ตรงเป๊ะ
   ใช้ร่วมกันได้ทั้ง ThermalBill / Quote.html / หน้าเว็บสาธารณะ
   แก้ราคาที่ไฟล์นี้ที่เดียว = ใช้ตรงกันทุกที่
   ------------------------------------------------------------
   หมายเหตุ: ยังไม่รวม "พื้นที่พิเศษ (ขั้นต่ำ)" และ "ราคาลูกค้าพิเศษ"
   ที่ดึงจาก Firestore ผ่าน DispatchApp — สองอย่างนั้นเป็น layer
   ทับราคา ค่อยต่อในเฟส 2 ถ้าต้องการให้เป๊ะระดับนั้น
   ============================================================ */
(function (root) {
  "use strict";

  /* ---------- สาขา ---------- */
  var BRANCHES = [
    { id: "bkk", label: "สาขากรุงเทพ", short: "กทม." },
    { id: "ssk", label: "สาขาศรีสะเกษ", short: "ศก." },
    { id: "krt", label: "สาขานครราชสีมา", short: "นม." }
  ];

  /* ---------- โซนต้นทาง → ปลายทาง (near/far/special) ---------- */
  var BKK_ZONES = {
    "กรุงเทพมหานคร":"near","นนทบุรี":"near","สมุทรปราการ":"near","ปทุมธานี":"near",
    "สมุทรสาคร":"near","สมุทรสงคราม":"near","นครปฐม":"near","อยุธยา":"near",
    "พระนครศรีอยุธยา":"near","นครนายก":"near","ลพบุรี":"near","สระบุรี":"near",
    "อ่างทอง":"near","สิงห์บุรี":"near","ชัยนาท":"near","อุทัยธานี":"near",
    "สุพรรณบุรี":"near","กาญจนบุรี":"near","ราชบุรี":"near","เพชรบุรี":"near",
    "ชลบุรี":"near","ระยอง":"near","ฉะเชิงเทรา":"near","ปราจีนบุรี":"near",
    "นครสวรรค์":"far","กำแพงเพชร":"far","พิจิตร":"far","ตาก":"far","จันทบุรี":"far",
    "ตราด":"far","สระแก้ว":"far","ประจวบคีรีขันธ์":"far","ชุมพร":"far",
    "นครราชสีมา":"far","บุรีรัมย์":"far","สุรินทร์":"far","ชัยภูมิ":"far",
    "ศรีสะเกษ":"far","อุบลราชธานี":"far","ยโสธร":"far","อำนาจเจริญ":"far",
    "พิษณุโลก":"far","สุโขทัย":"far","เพชรบูรณ์":"far","อุตรดิตถ์":"far",
    "ขอนแก่น":"far","อุดรธานี":"far","หนองคาย":"far","นครพนม":"far","สกลนคร":"far",
    "กาฬสินธุ์":"far","มหาสารคาม":"far","ร้อยเอ็ด":"far","เลย":"far",
    "หนองบัวลำภู":"far","บึงกาฬ":"far","มุกดาหาร":"far",
    "ภูเก็ต":"special","เกาะสมุย":"special","พังงา":"special","กระบี่":"special"
  };
  var SSK_ZONES = {
    "ศรีสะเกษ":"near","อุบลราชธานี":"near","สุรินทร์":"near",
    "ยโสธร":"far","อำนาจเจริญ":"far","บุรีรัมย์":"far","มุกดาหาร":"far","ร้อยเอ็ด":"far",
    "นครราชสีมา":"far","ขอนแก่น":"far","มหาสารคาม":"far","กาฬสินธุ์":"far",
    "อุดรธานี":"far","สกลนคร":"far","นครพนม":"far","หนองคาย":"far","ชัยภูมิ":"far",
    "เลย":"far","หนองบัวลำภู":"far","บึงกาฬ":"far","กรุงเทพมหานคร":"far","นนทบุรี":"far",
    "ปทุมธานี":"far","สมุทรปราการ":"far","ชลบุรี":"far","ระยอง":"far","นครสวรรค์":"far",
    "พิษณุโลก":"far","ฉะเชิงเทรา":"far","ปราจีนบุรี":"far","สระแก้ว":"far",
    "ตราด":"special","ภูเก็ต":"special","เกาะสมุย":"special"
  };
  var KRT_ZONES = {
    "นครราชสีมา":"near","ชัยภูมิ":"far","บุรีรัมย์":"near","สุรินทร์":"near",
    "ศรีสะเกษ":"near","ขอนแก่น":"far","มหาสารคาม":"far","ร้อยเอ็ด":"near","ยโสธร":"near",
    "กาฬสินธุ์":"near","เลย":"near","สระบุรี":"near","ลพบุรี":"near","นครสวรรค์":"near",
    "สิงห์บุรี":"near","อ่างทอง":"near","อยุธยา":"near","พระนครศรีอยุธยา":"near",
    "ปทุมธานี":"near","กรุงเทพมหานคร":"far","นนทบุรี":"far","สมุทรปราการ":"far",
    "ชลบุรี":"far","ระยอง":"far","ฉะเชิงเทรา":"far","ปราจีนบุรี":"far","สระแก้ว":"far",
    "อุบลราชธานี":"far","อำนาจเจริญ":"far","มุกดาหาร":"far","อุดรธานี":"far",
    "หนองคาย":"far","นครพนม":"far","สกลนคร":"far","หนองบัวลำภู":"far","บึงกาฬ":"far",
    "พิษณุโลก":"far","กำแพงเพชร":"far","ตาก":"far","อุตรดิตถ์":"far","ชุมพร":"far",
    "ประจวบคีรีขันธ์":"far","ตราด":"special","ภูเก็ต":"special"
  };
  // อำเภอที่ near สำหรับสาขา krt (ชัยภูมิ/ขอนแก่นบางอำเภอ)
  var KRT_NEAR_AMPHOE = {
    "ชัยภูมิ": ["เนินสง่า","บำเหน็จณรงค์"],
    "ขอนแก่น": ["เปือยน้อย","หนองสองห้อง","พล"]
  };
  // อำเภอกาญจนบุรีที่ไกล (เกิน 180 กม.) → far
  var KANCHAN_FAR_AMPHOE = ["สังขละบุรี","ทองผาภูมิ","ศรีสวัสดิ์","ไทรโยค","หนองปรือ"];

  var BRANCH_ZONES = { bkk: BKK_ZONES, ssk: SSK_ZONES, krt: KRT_ZONES };

  /* ---------- ตารางขนาด + ราคา near/far ---------- */
  var SIZES = [
    { id:"mini",  label:"Mini",   maxKg:2,        maxCm:30,       near:30,  far:40 },
    { id:"s",     label:"S",      maxKg:5,        maxCm:50,       near:60,  far:80 },
    { id:"m",     label:"M",      maxKg:10,       maxCm:80,       near:80,  far:100 },
    { id:"mplus", label:"M+",     maxKg:15,       maxCm:100,      near:100, far:120 },
    { id:"l",     label:"L",      maxKg:20,       maxCm:120,      near:120, far:150 },
    { id:"xl",    label:"XL",     maxKg:25,       maxCm:150,      near:150, far:180 },
    { id:"jumbo", label:"Jumbo",  maxKg:30,       maxCm:180,      near:180, far:220 },
    { id:"jumbx", label:"JumboX", maxKg:35,       maxCm:200,      near:250, far:300 },
    { id:"custom",label:"อื่นๆ",   maxKg:Infinity, maxCm:Infinity, near:null,far:null }
  ];
  var SPECIAL_SURCHARGE = 80; // พื้นที่พิเศษ = ราคา near + 80

  /* ---------- สินค้าคิดตาม "ยาว+น้ำหนัก" (กระเบื้อง/ไม้เทียม) ---------- */
  var DIM_GOODS = {
    tile: { label:"กระเบื้อง", bands:[
      {maxCm:60,  label:"ยาว≤60ซม",  w:[{maxKg:20,near:120,far:150},{maxKg:25,near:150,far:180},{maxKg:30,near:180,far:220},{maxKg:35,near:220,far:240}]},
      {maxCm:90,  label:"ยาว≤90ซม",  w:[{maxKg:20,near:150,far:180},{maxKg:25,near:200,far:220},{maxKg:30,near:220,far:240},{maxKg:35,near:240,far:300}]},
      {maxCm:120, label:"ยาว≤120ซม", w:[{maxKg:20,near:180,far:220},{maxKg:25,near:220,far:240},{maxKg:30,near:240,far:300},{maxKg:35,near:300,far:340}]},
      {maxCm:180, label:"ยาว≤180ซม", w:[{maxKg:35,near:400,far:500}]}
    ]},
    wood: { label:"ไม้เทียม", bands:[
      {maxCm:300, label:"ยาว≤3ม", w:[{maxKg:25,near:400,far:500},{maxKg:30,near:450,far:500},{maxKg:35,near:500,far:600}]},
      {maxCm:400, label:"ยาว≤4ม", w:[{maxKg:25,near:500,far:600},{maxKg:30,near:600,far:700},{maxKg:35,near:700,far:800}]},
      {maxCm:600, label:"ยาว≤6ม", w:[{maxKg:35,near:1500,far:1800}]}
    ]}
  };

  var ALL_PROVS = [
    "กระบี่","กรุงเทพมหานคร","กาญจนบุรี","กาฬสินธุ์","กำแพงเพชร","ขอนแก่น","จันทบุรี",
    "ฉะเชิงเทรา","ชลบุรี","ชัยนาท","ชัยภูมิ","ชุมพร","เชียงราย","เชียงใหม่","ตรัง","ตราด",
    "ตาก","นครนายก","นครปฐม","นครพนม","นครราชสีมา","นครศรีธรรมราช","นครสวรรค์","นนทบุรี",
    "นราธิวาส","น่าน","บึงกาฬ","บุรีรัมย์","ปทุมธานี","ประจวบคีรีขันธ์","ปราจีนบุรี","ปัตตานี",
    "พระนครศรีอยุธยา","พะเยา","พังงา","พัทลุง","พิจิตร","พิษณุโลก","เพชรบุรี","เพชรบูรณ์","แพร่",
    "ภูเก็ต","มหาสารคาม","มุกดาหาร","แม่ฮ่องสอน","ยโสธร","ยะลา","ร้อยเอ็ด","ระนอง","ระยอง",
    "ราชบุรี","ลพบุรี","ลำปาง","ลำพูน","เลย","ศรีสะเกษ","สกลนคร","สงขลา","สตูล","สมุทรปราการ",
    "สมุทรสงคราม","สมุทรสาคร","สระแก้ว","สระบุรี","สิงห์บุรี","สุโขทัย","สุพรรณบุรี",
    "สุราษฎร์ธานี","สุรินทร์","หนองคาย","หนองบัวลำภู","อ่างทอง","อำนาจเจริญ","อุดรธานี",
    "อุตรดิตถ์","อุทัยธานี","อุบลราชธานี"
  ];

  /* ---------- ฟังก์ชันคิดราคา (แกะจาก ThermalBill) ---------- */
  function calcSize(kg, sumCm) {
    var kgN = parseFloat(kg) || 0, cmN = parseFloat(sumCm) || 0;
    if (kgN <= 0 && cmN <= 0) return SIZES[0];
    var byKg = SIZES.find(function (s) { return s.maxKg !== Infinity && kgN <= s.maxKg; }) || SIZES[SIZES.length - 1];
    var byCm = SIZES.find(function (s) { return s.maxCm !== Infinity && cmN <= s.maxCm; }) || SIZES[SIZES.length - 1];
    return SIZES.indexOf(byKg) >= SIZES.indexOf(byCm) ? byKg : byCm;
  }

  function getZone(branch, prov, amphoe) {
    if (prov === "กาญจนบุรี" && KANCHAN_FAR_AMPHOE.indexOf(amphoe || "") !== -1) return "far";
    if (branch === "krt" && amphoe && KRT_NEAR_AMPHOE[prov]) {
      return KRT_NEAR_AMPHOE[prov].indexOf(amphoe) !== -1 ? "near" : "far";
    }
    var map = BRANCH_ZONES[branch];
    var z = map ? map[prov] : undefined;
    return z || "far"; // จังหวัดนอกพื้นที่บริการ → ไกล
  }

  function getSizePrice(size, zone, cpN, cpF) {
    if (!size || !zone) return 0;
    if (size.id === "custom") return zone === "near" ? (parseFloat(cpN) || 0) : (parseFloat(cpF) || 0);
    if (zone === "special") return (size.near || 0) + SPECIAL_SURCHARGE;
    return zone === "near" ? size.near : size.far;
  }

  function dimGoodsMaxCm(goodsId) { var g = DIM_GOODS[goodsId]; return g ? g.bands[g.bands.length - 1].maxCm : 0; }

  function dimGoodsPrice(goodsId, kg, cm, zone) {
    var g = DIM_GOODS[goodsId]; if (!g) return { err: "ไม่รู้จักสินค้า" };
    kg = parseFloat(kg) || 0; cm = parseFloat(cm) || 0;
    if (kg <= 0 || cm <= 0) return { err: "กรอกน้ำหนัก(กก.)และความยาว(ซม.)ก่อน" };
    var band = g.bands.filter(function (b) { return cm <= b.maxCm; })[0];
    if (!band) return { err: g.label + " ยาวเกิน " + dimGoodsMaxCm(goodsId) + " ซม. — ตีราคาพิเศษ สอบถามไลน์" };
    var row = band.w.filter(function (x) { return kg <= x.maxKg; })[0];
    if (!row) return { err: "น้ำหนักเกินเรทไซส์นี้ — ตีราคาพิเศษ สอบถามไลน์" };
    var price = (zone === "near") ? row.near : row.far;
    return { price: price, label: g.label + " " + band.label + " ≤" + row.maxKg + "กก" };
  }

  /* ---------- ตัวช่วยเรียกครั้งเดียวจบ ---------- */
  // opts: { branch, prov, amphoe, kg, sumCm }  หรือสินค้ายาว { branch, prov, amphoe, goodsId, kg, lengthCm }
  function quote(opts) {
    opts = opts || {};
    var branch = opts.branch || "bkk";
    var zone = getZone(branch, opts.prov, opts.amphoe);
    var zoneLabel = zone === "near" ? "ใกล้" : zone === "far" ? "ไกล" : "พื้นที่พิเศษ";

    if (opts.goodsId) { // สินค้าคิดตามยาว+น้ำหนัก
      var r = dimGoodsPrice(opts.goodsId, opts.kg, opts.lengthCm, zone);
      if (r.err) return { ok:false, zone:zone, zoneLabel:zoneLabel, error:r.err };
      return { ok:true, zone:zone, zoneLabel:zoneLabel, mode:"dim", label:r.label, price:r.price };
    }

    var size = calcSize(opts.kg, opts.sumCm);
    if (size.id === "custom") {
      return { ok:false, zone:zone, zoneLabel:zoneLabel, size:size,
               error:"เกินเรทมาตรฐาน (น้ำหนัก/ขนาดใหญ่มาก) — ตีราคาพิเศษ สอบถามไลน์" };
    }
    var price = getSizePrice(size, zone);
    return { ok:true, zone:zone, zoneLabel:zoneLabel, mode:"size", size:size, price:price };
  }

  var API = {
    BRANCHES: BRANCHES, SIZES: SIZES, ALL_PROVS: ALL_PROVS, DIM_GOODS: DIM_GOODS,
    SPECIAL_SURCHARGE: SPECIAL_SURCHARGE, BRANCH_ZONES: BRANCH_ZONES,
    KRT_NEAR_AMPHOE: KRT_NEAR_AMPHOE, KANCHAN_FAR_AMPHOE: KANCHAN_FAR_AMPHOE,
    calcSize: calcSize, getZone: getZone, getSizePrice: getSizePrice,
    dimGoodsPrice: dimGoodsPrice, dimGoodsMaxCm: dimGoodsMaxCm, quote: quote
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.GolodPricing = API;
})(typeof window !== "undefined" ? window : this);
