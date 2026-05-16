// ===== โกโลด ทรานสปอร์ต — Sample Data 100 บิล =====
// ใช้ไฟล์นี้ include ในทุกหน้าแทน hardcode data

// ===== CLERKS / เสมียน =====
var CLERKS = [
  {code:"A", name:"วัชรา",   branch:"กรุงเทพ",   area:"กทม/ปทุมธานี"},
  {code:"B", name:"บุญมี",   branch:"กรุงเทพ",   area:"กทม/ปทุมธานี"},
  {code:"N", name:"นภา",     branch:"กรุงเทพ",   area:"กทม/ปทุมธานี"},
  {code:"P", name:"ปิยะ",    branch:"ปทุมธานี",  area:"กทม/ปทุมธานี"},
  {code:"H", name:"หนึ่ง",   branch:"นครราชสีมา",area:"ภาคอีสาน"},
  {code:"S", name:"สมศรี",   branch:"ศรีสะเกษ",  area:"ภาคอีสาน"},
];

// ===== PROVINCES =====
// ภาคตะวันออก 30 บิล
var EAST_PROVS = [
  {prov:"ชลบุรี",    amphoe:"เมืองชลบุรี",   zone:"ใกล้"},
  {prov:"ชลบุรี",    amphoe:"พัทยา",          zone:"ใกล้"},
  {prov:"ชลบุรี",    amphoe:"บางละมุง",       zone:"ใกล้"},
  {prov:"ระยอง",     amphoe:"เมืองระยอง",     zone:"ใกล้"},
  {prov:"ระยอง",     amphoe:"ปลวกแดง",        zone:"ใกล้"},
  {prov:"จันทบุรี",  amphoe:"เมืองจันทบุรี",  zone:"ไกล"},
  {prov:"ตราด",      amphoe:"เมืองตราด",      zone:"ไกล"},
  {prov:"ฉะเชิงเทรา",amphoe:"เมืองฉะเชิงเทรา",zone:"ใกล้"},
  {prov:"ปราจีนบุรี",amphoe:"เมืองปราจีนบุรี",zone:"ใกล้"},
  {prov:"สระแก้ว",   amphoe:"เมืองสระแก้ว",  zone:"ไกล"},
];
// ภาคอีสาน 70 บิล
var ISAN_PROVS = [
  {prov:"นครราชสีมา",amphoe:"เมืองนครราชสีมา",zone:"ไกล"},
  {prov:"นครราชสีมา",amphoe:"โคกกรวด",         zone:"ไกล"},
  {prov:"นครราชสีมา",amphoe:"ปากช่อง",          zone:"ไกล"},
  {prov:"ขอนแก่น",   amphoe:"เมืองขอนแก่น",   zone:"ไกล"},
  {prov:"ขอนแก่น",   amphoe:"บ้านไผ่",          zone:"ไกล"},
  {prov:"อุดรธานี",  amphoe:"เมืองอุดรธานี",  zone:"ไกล"},
  {prov:"อุบลราชธานี",amphoe:"เมืองอุบล",      zone:"ไกล"},
  {prov:"อุบลราชธานี",amphoe:"วารินชำราบ",      zone:"ไกล"},
  {prov:"สุรินทร์",  amphoe:"เมืองสุรินทร์",  zone:"ไกล"},
  {prov:"บุรีรัมย์", amphoe:"เมืองบุรีรัมย์", zone:"ไกล"},
  {prov:"ศรีสะเกษ",  amphoe:"เมืองศรีสะเกษ",  zone:"ไกล"},
  {prov:"ศรีสะเกษ",  amphoe:"กันทรลักษ์",      zone:"ไกล"},
  {prov:"ยโสธร",     amphoe:"เมืองยโสธร",     zone:"ไกล"},
  {prov:"อำนาจเจริญ",amphoe:"เมืองอำนาจเจริญ",zone:"ไกล"},
  {prov:"มหาสารคาม", amphoe:"เมืองมหาสารคาม", zone:"ไกล"},
  {prov:"ร้อยเอ็ด",  amphoe:"เมืองร้อยเอ็ด",  zone:"ไกล"},
  {prov:"กาฬสินธุ์", amphoe:"เมืองกาฬสินธุ์", zone:"ไกล"},
  {prov:"สกลนคร",    amphoe:"เมืองสกลนคร",    zone:"ไกล"},
  {prov:"นครพนม",    amphoe:"เมืองนครพนม",    zone:"ไกล"},
  {prov:"เลย",       amphoe:"เมืองเลย",       zone:"ไกล"},
];

var BIZ_TYPES = ["ทั่วไป","อิเล็กทรอนิกส์","เฟอร์นิเจอร์","เสื้อผ้า","อาหารแห้ง","เครื่องใช้ไฟฟ้า","อุปกรณ์การเกษตร"];
var PAY_METHODS = ["origin","dest_cash","transfer","dest_transfer","credit"];
var PAY_WEIGHTS = [0.30, 0.20, 0.35, 0.10, 0.05]; // probability
var SIZES = ["S","M","L","XL"];
var STATUS_LIST = ["delivered","delivered","delivered","transit","nocontact","reschedule"];

var SENDER_NAMES = [
  "บริษัท เอ จำกัด","ห้างหุ้นส่วน บี","ร้านเบสท์","คุณสมชาย ใจดี","บริษัท ซี จำกัด",
  "คุณมานี มีสุข","ห้างหุ้นส่วน ดี","บริษัท อี คอร์ปอเรชั่น","ร้านดาวเรือง","คุณวิชัย สุขสันต์",
  "บริษัท เอฟ กรุ๊ป","คุณสมหญิง ดีใจ","ร้านรุ่งเรือง","บริษัท จี จำกัด","คุณประสิทธิ์ มั่นคง",
  "ห้างหุ้นส่วน เอช","คุณนิดา สดใส","บริษัท ไอ จำกัด","ร้านสมบูรณ์","คุณอนุชา ยิ้มแย้ม",
];
var RECEIVER_NAMES = [
  "คุณสมหมาย","ร้านดีดี","บ.ฉัตร","คุณวิไล","คุณนิด",
  "ร้านดาว","คุณสมปอง","บ.รุ่งเรือง","คุณมนัส","ร้านสุขใจ",
  "คุณพิมพ์","บ.เจริญ","คุณอรุณ","ร้านมั่งมี","คุณสุดา",
  "บ.ก้าวหน้า","คุณทองดี","ร้านสว่าง","คุณประไพ","บ.สมบูรณ์",
];

function rnd(min,max,s){
  s=s||Math.random();
  return Math.floor(min+(max-min)*s);
}
function pick(arr,s){return arr[Math.floor((s||Math.random())*arr.length)%arr.length];}
function pickWeighted(arr,weights,r){
  var cum=0; r=r||Math.random();
  for(var i=0;i<arr.length;i++){cum+=weights[i];if(r<cum)return arr[i];}
  return arr[arr.length-1];
}
function pad(n){return String(n).padStart(2,"0");}
function dateStr(daysAgo){
  var d=new Date(); d.setDate(d.getDate()-daysAgo);
  return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
}
function thDateStr(daysAgo){
  var d=new Date(); d.setDate(d.getDate()-daysAgo);
  return (d.getFullYear()+543)+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
}

// ===== GENERATE 100 BILLS =====
// East: 30 bills — clerks กทม/ปทุมธานี (A,B,N,P)
// Isan: 70 bills — all clerks แต่เน้น H,S สำหรับปลายทาง
function generateBills(){
  var bills=[];
  var seed=12345;
  function ns(){seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff;}

  // ===== ภาคตะวันออก 30 บิล =====
  var eastClerks=["A","B","N","P"]; // กทม+ปทุมธานี
  for(var i=1;i<=30;i++){
    var clerkCode=eastClerks[i%4];
    var clerk=CLERKS.find(function(c){return c.code===clerkCode;});
    var dest=EAST_PROVS[i%EAST_PROVS.length];
    var daysAgo=rnd(0,30,ns());
    var method=pickWeighted(PAY_METHODS,PAY_WEIGHTS,ns());
    var weight=rnd(1,30,ns());
    var items=rnd(1,5,ns());
    var basePrice=dest.zone==="ใกล้"?200:350;
    var freight=basePrice+weight*12+items*20;
    var codAmt=(method==="dest_cash")?rnd(500,5000,ns()):0;
    var size=weight<=5?"S":weight<=15?"M":weight<=25?"L":"XL";
    var status=pick(STATUS_LIST,ns());
    var billNo=clerkCode+pad(new Date().getMonth()+1)+pad(new Date().getDate())+"-"+pad(i);
    bills.push({
      billNo:billNo,
      date:dateStr(daysAgo),
      thDate:thDateStr(daysAgo),
      clerkCode:clerkCode,
      clerkName:clerk.name,
      branch:clerk.branch,
      region:"ภาคตะวันออก",
      senderName:pick(SENDER_NAMES,ns()),
      senderProv:"กรุงเทพมหานคร",
      senderAmphoe:"พระนคร",
      receiverName:pick(RECEIVER_NAMES,ns()),
      destProv:dest.prov,
      destAmphoe:dest.amphoe,
      zone:dest.zone,
      weight:weight,
      items:items,
      size:size,
      bizType:pick(BIZ_TYPES,ns()),
      freightNet:freight,
      codTotal:codAmt,
      freightPay:method,
      status:status,
      paid:status==="delivered"&&ns()>0.2,
      note:"",
    });
  }

  // ===== ภาคอีสาน 70 บิล =====
  // กระจาย: A,B,N,P รับงานที่กทม แล้วส่งไปอีสาน | H รับที่โคราช | S รับที่ศก.
  var isanAssign=[
    {range:[1,20],  clerks:["A","B"], branch:"กรุงเทพ"},   // กทม 20 บิล
    {range:[21,35], clerks:["N","P"], branch:"กรุงเทพ"},   // กทม/ปทุมธานี 15 บิล
    {range:[36,55], clerks:["H"],     branch:"นครราชสีมา"},// โคราช 20 บิล
    {range:[56,70], clerks:["S"],     branch:"ศรีสะเกษ"},  // ศก. 15 บิล
  ];

  for(var j=1;j<=70;j++){
    var assign=isanAssign.find(function(a){return j>=a.range[0]&&j<=a.range[1];});
    var clerkCode2=assign.clerks[j%assign.clerks.length];
    var clerk2=CLERKS.find(function(c){return c.code===clerkCode2;});
    var dest2=ISAN_PROVS[j%ISAN_PROVS.length];
    var daysAgo2=rnd(0,30,ns());
    var method2=pickWeighted(PAY_METHODS,PAY_WEIGHTS,ns());
    var weight2=rnd(1,50,ns());
    var items2=rnd(1,8,ns());
    var freight2=350+weight2*10+items2*25;
    var codAmt2=(method2==="dest_cash")?rnd(500,8000,ns()):0;
    var size2=weight2<=5?"S":weight2<=15?"M":weight2<=25?"L":"XL";
    var status2=pick(STATUS_LIST,ns());
    var num=30+j;
    var billNo2=clerkCode2+pad(new Date().getMonth()+1)+pad(new Date().getDate())+"-"+pad(num);
    bills.push({
      billNo:billNo2,
      date:dateStr(daysAgo2),
      thDate:thDateStr(daysAgo2),
      clerkCode:clerkCode2,
      clerkName:clerk2.name,
      branch:assign.branch,
      region:"ภาคอีสาน",
      senderName:pick(SENDER_NAMES,ns()),
      senderProv:assign.branch==="กรุงเทพ"?"กรุงเทพมหานคร":assign.branch==="นครราชสีมา"?"นครราชสีมา":"ศรีสะเกษ",
      senderAmphoe:assign.branch==="กรุงเทพ"?"ลาดพร้าว":"เมือง",
      receiverName:pick(RECEIVER_NAMES,ns()),
      destProv:dest2.prov,
      destAmphoe:dest2.amphoe,
      zone:"ไกล",
      weight:weight2,
      items:items2,
      size:size2,
      bizType:pick(BIZ_TYPES,ns()),
      freightNet:freight2,
      codTotal:codAmt2,
      freightPay:method2,
      status:status2,
      paid:status2==="delivered"&&ns()>0.2,
      note:"",
    });
  }

  return bills.sort(function(a,b){return b.date.localeCompare(a.date);});
}

var SAMPLE_BILLS = generateBills();

// ===== SUMMARY HELPERS =====
function billsByRegion(){
  var east=SAMPLE_BILLS.filter(function(b){return b.region==="ภาคตะวันออก";});
  var isan=SAMPLE_BILLS.filter(function(b){return b.region==="ภาคอีสาน";});
  return{east:east, isan:isan,
    eastTotal:east.reduce(function(s,b){return s+b.freightNet;},0),
    isanTotal:isan.reduce(function(s,b){return s+b.freightNet;},0)};
}
function billsByClerk(){
  var result={};
  CLERKS.forEach(function(c){
    var myBills=SAMPLE_BILLS.filter(function(b){return b.clerkCode===c.code;});
    result[c.code]={clerk:c, bills:myBills, total:myBills.reduce(function(s,b){return s+b.freightNet;},0)};
  });
  return result;
}
function billsByProvince(){
  var result={};
  SAMPLE_BILLS.forEach(function(b){
    if(!result[b.destProv])result[b.destProv]={prov:b.destProv,zone:b.zone,bills:[],total:0,items:0};
    result[b.destProv].bills.push(b);
    result[b.destProv].total+=b.freightNet;
    result[b.destProv].items+=b.items;
  });
  return Object.values(result).sort(function(a,b){return b.total-a.total;});
}

// ===== QUICK STATS (console preview) =====
var stats = billsByRegion();
console.log("=== โกโลด ทรานสปอร์ต — Sample Data ===");
console.log("บิลทั้งหมด:", SAMPLE_BILLS.length);
console.log("ภาคตะวันออก:", stats.east.length, "บิล | ยอด:", Math.round(stats.eastTotal).toLocaleString(), "฿");
console.log("ภาคอีสาน:", stats.isan.length, "บิล | ยอด:", Math.round(stats.isanTotal).toLocaleString(), "฿");
var byClerk = billsByClerk();
CLERKS.forEach(function(c){
  var d=byClerk[c.code];
  console.log("เสมียน "+c.name+" ("+c.code+") - "+c.branch+": "+d.bills.length+" บิล | "+Math.round(d.total).toLocaleString()+" ฿");
});
