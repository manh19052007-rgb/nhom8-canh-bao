/**
 * BACKEND LƯU LƯỢT TRUY CẬP & ĐÁNH GIÁ CHO WEB NHÓM 8 (Google Apps Script + Google Sheet)
 *
 * CÁCH CÀI (làm 1 lần, khoảng 5 phút):
 * 1. Vào sheets.google.com, tạo một Google Sheet mới (đặt tên tuỳ ý, ví dụ "Du lieu web nhom 8").
 * 2. Trong Sheet: menu Tiện ích mở rộng (Extensions) → Apps Script.
 * 3. Xoá code mẫu, dán TOÀN BỘ nội dung file này vào, bấm Lưu (biểu tượng đĩa mềm).
 * 4. Bấm Triển khai (Deploy) → Tùy chọn triển khai mới (New deployment) → chọn loại "Ứng dụng web" (Web app):
 *      - Execute as (Thực thi với tư cách): Me (Tôi)
 *      - Who has access (Ai có quyền truy cập): Anyone (Bất kỳ ai)
 *    Bấm Triển khai, cấp quyền khi Google hỏi (chọn tài khoản → Advanced → Go to ... (unsafe) → Allow).
 * 5. Sao chép "URL ứng dụng web" (kết thúc bằng /exec), dán vào dòng  var BACKEND_URL = ""  trong file site-data.js.
 * 6. Tải site-data.js mới lên GitHub. Từ đó mọi lượt truy cập và đánh giá sẽ ghi vào Sheet,
 *    và tài khoản admin trên web sẽ xem được thống kê của tất cả mọi người.
 *
 * LƯU Ý: Khi sửa code trong file này, phải Triển khai lại bằng "Quản lý triển khai → Chỉnh sửa → Phiên bản mới".
 * Tài khoản và mật khẩu admin chỉ nằm ở đây (trong Google của bạn), không nằm trong code công khai của web.
 */
var ADMIN_USER = 'mmb123';
var ADMIN_PASS = '123456';
var MAX_VISITS_RETURNED = 3000;
var MAX_RATINGS_RETURNED = 500;
var H_VISITS = ['Thời gian', 'Mã khách', 'Trang', 'Thiết bị'];
var H_RATINGS = ['Thời gian', 'Mã khách', 'Chung', 'Giao diện', 'Tốc độ', 'Dễ sử dụng', 'Tính năng', 'Nội dung thích nhất', 'Góp ý', 'Thiết bị'];

function doGet() { return json_({ ok: true, message: 'Backend Nhom 8 dang chay' }); }

function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }

  if (d.action === 'visit') {
    return add_('Visits', H_VISITS, [new Date(), txt_(d.vid, 60), txt_(d.page, 40), txt_(d.device, 20)]);
  }
  if (d.action === 'rating') {
    var overall = num_(d.overall);
    if (overall < 1) return json_({ ok: false, error: 'invalid' });
    var feats = (d.features || []).slice(0, 10).map(function (f) { return txt_(f, 60); }).join('|');
    return add_('Ratings', H_RATINGS, [new Date(), txt_(d.vid, 60), overall, num_(d.giaoDien), num_(d.tocDo), num_(d.deSuDung), num_(d.tinhNang), feats, txt_(d.comment, 300), txt_(d.device, 20)]);
  }
  if (d.action === 'stats') {
    if (d.user !== ADMIN_USER || d.pass !== ADMIN_PASS) return json_({ ok: false, error: 'auth' });
    return stats_();
  }
  return json_({ ok: false, error: 'unknown' });
}

function stats_() {
  var vs = rows_('Visits', H_VISITS), rs = rows_('Ratings', H_RATINGS), uniq = {};
  vs.forEach(function (r) { uniq[r[1]] = 1; });
  return json_({
    ok: true,
    totalViews: vs.length,
    uniqueVisitors: Object.keys(uniq).length,
    visits: vs.slice(-MAX_VISITS_RETURNED).map(function (r) { return { t: new Date(r[0]).toISOString(), vid: String(r[1]), page: String(r[2]), device: String(r[3]) }; }),
    ratings: rs.slice(-MAX_RATINGS_RETURNED).map(function (r) {
      return { t: new Date(r[0]).toISOString(), vid: String(r[1]), overall: +r[2], giaoDien: +r[3], tocDo: +r[4], deSuDung: +r[5], tinhNang: +r[6],
               features: String(r[7] || '').split('|').filter(String), comment: String(r[8] || ''), device: String(r[9] || '') };
    })
  });
}

function sheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}
function rows_(name, headers) { return sheet_(name, headers).getDataRange().getValues().slice(1); }
function add_(name, headers, row) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { sheet_(name, headers).appendRow(row); } finally { lock.releaseLock(); }
  return json_({ ok: true });
}
function num_(v) { v = Math.round(Number(v)); return v >= 1 && v <= 5 ? v : 0; }
function txt_(v, max) {
  var s = String(v == null ? '' : v).slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s; // chặn công thức độc hại trong Google Sheet
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
