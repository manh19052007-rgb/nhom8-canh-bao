/* Form đánh giá cho khách + bảng điều khiển Admin (chỉ có ở trang chủ) */
(function () {
  "use strict";
  var SD = window.SiteData;
  if (!SD) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); };
  var fmt = function (n) { return Number(n || 0).toLocaleString("vi-VN"); };

  /* ================= FORM ĐÁNH GIÁ ================= */
  var form = $("#rateForm"), thanks = $("#rateThanks");
  if (form) {
    var vals = { overall: 0, giaoDien: 0, tocDo: 0, deSuDung: 0, tinhNang: 0 };
    var paint = function (box, v) {
      $$(".star", box).forEach(function (s) { var on = +s.dataset.v <= v; s.classList.toggle("on", on); s.setAttribute("aria-pressed", on); });
    };
    $$(".stars", form).forEach(function (box) {
      var name = box.dataset.name, html = "";
      for (var i = 1; i <= 5; i++) html += '<button type="button" class="star" data-v="' + i + '" aria-label="' + i + ' sao">★</button>';
      box.innerHTML = html;
      box.addEventListener("click", function (e) {
        var b = e.target.closest(".star"); if (!b) return;
        var v = +b.dataset.v;
        vals[name] = (vals[name] === v && name !== "overall") ? 0 : v;
        paint(box, vals[name]);
      });
    });
    var showThanks = function (on) { form.hidden = on; thanks.hidden = !on; };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $("#rateMsg"), btn = $("button[type=submit]", form);
      if (!vals.overall) { msg.textContent = "Vui lòng chọn số sao ở mục Đánh giá chung."; msg.className = "rate-msg err"; return; }
      var rec = {
        overall: vals.overall, giaoDien: vals.giaoDien, tocDo: vals.tocDo, deSuDung: vals.deSuDung, tinhNang: vals.tinhNang,
        features: $$("input[name=feat]:checked", form).map(function (i) { return i.value; }),
        comment: form.comment.value.trim().slice(0, 300)
      };
      btn.disabled = true; msg.textContent = "Đang gửi..."; msg.className = "rate-msg";
      SD.submitRating(rec).then(function (ok) {
        btn.disabled = false;
        if (ok) { SD.markRated(); msg.textContent = ""; showThanks(true); }
        else { msg.textContent = "Chưa gửi được, bạn thử lại sau nhé."; msg.className = "rate-msg err"; }
      });
    });
    $("#rateAgain").addEventListener("click", function () { showThanks(false); });
    if (SD.hasRated()) showThanks(true);
  }

  /* ================= ADMIN ================= */
  var dlg = $("#adminDlg"), openBtn = $("#adminOpen");
  if (!dlg || !openBtn) return;
  var session = null, tab = "overview";
  var ICON = {
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    refresh: '<path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>'
  };
  var svg = function (k) { return '<svg class="adm-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + "</svg>"; };
  var stars = function (v) { var r = Math.round(v), s = ""; for (var i = 1; i <= 5; i++) s += '<i class="' + (i <= r ? "on" : "") + '">★</i>'; return '<span class="adm-stars" aria-label="' + v + ' trên 5 sao">' + s + "</span>"; };
  var bar = function (label, n, max) { return '<div class="adm-bar"><span>' + esc(label) + '</span><i><u style="width:' + (max ? Math.round(n / max * 100) : 0) + '%"></u></i><b>' + n + "</b></div>"; };
  var dayKey = function (x) { var d = new Date(x); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };

  function compute(d) {
    var visits = d.visits || [], ratings = d.ratings || [], i;
    var days = [], map = {};
    for (i = 13; i >= 0; i--) {
      var x = new Date(); x.setDate(x.getDate() - i);
      var o = { key: dayKey(x), label: ("0" + x.getDate()).slice(-2) + "/" + ("0" + (x.getMonth() + 1)).slice(-2), n: 0 };
      days.push(o); map[o.key] = o;
    }
    var today = dayKey(new Date()), todayN = 0, pages = {};
    visits.forEach(function (v) { var k = dayKey(v.t); if (map[k]) map[k].n++; if (k === today) todayN++; pages[v.page] = (pages[v.page] || 0) + 1; });
    var n = ratings.length, sum = 0, dist = [0, 0, 0, 0, 0, 0], feat = {};
    var crit = [["giaoDien", "Giao diện"], ["tocDo", "Tốc độ"], ["deSuDung", "Dễ sử dụng"], ["tinhNang", "Tính năng"]];
    var cs = {}, cn = {};
    ratings.forEach(function (r) {
      sum += +r.overall; dist[+r.overall] = (dist[+r.overall] || 0) + 1;
      crit.forEach(function (c) { if (+r[c[0]] > 0) { cs[c[0]] = (cs[c[0]] || 0) + +r[c[0]]; cn[c[0]] = (cn[c[0]] || 0) + 1; } });
      (r.features || []).forEach(function (f) { feat[f] = (feat[f] || 0) + 1; });
    });
    return {
      total: d.totalViews != null ? d.totalViews : visits.length,
      unique: d.uniqueVisitors != null ? d.uniqueVisitors : 0,
      today: todayN, days: days, n: n, avg: n ? sum / n : 0, dist: dist,
      crit: crit.map(function (c) { return [c[1], cn[c[0]] ? cs[c[0]] / cn[c[0]] : 0]; }),
      feats: Object.keys(feat).map(function (k) { return [k, feat[k]]; }).sort(function (a, b) { return b[1] - a[1]; }),
      pages: Object.keys(pages).map(function (k) { return [k, pages[k]]; }).sort(function (a, b) { return b[1] - a[1]; }),
      recent: visits.slice(-40).reverse(), reviews: ratings.slice().reverse()
    };
  }

  function shell(inner, extraTop) {
    return '<div class="adm"><div class="adm-top"><h2 class="adm-title">' + svg("shield") + (extraTop ? "Bảng điều khiển Admin" : "Quản trị") + "</h2>" +
      '<div class="adm-actions">' + (extraTop ? '<button class="adm-btn" data-act="refresh">' + svg("refresh") + "<span>Tải lại</span></button>" +
      '<button class="adm-btn" data-act="logout">' + svg("out") + "<span>Đăng xuất</span></button>" : "") +
      '<button class="adm-x" data-act="close" aria-label="Đóng">×</button></div></div>' + inner + "</div>";
  }

  function renderLogin(err) {
    dlg.innerHTML = shell('<form class="adm-login" id="admLogin"><label>Tài khoản<input name="u" autocomplete="username" required></label>' +
      '<label>Mật khẩu<input name="p" type="password" autocomplete="current-password" required></label>' +
      '<p class="adm-err" role="alert">' + esc(err || "") + '</p><button class="adm-btn primary" type="submit">Đăng nhập</button></form>', false);
    var f = $("#admLogin");
    f.u.focus();
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var u = f.u.value.trim(), p = f.p.value, b = $("button", f);
      b.disabled = true; b.textContent = "Đang kiểm tra...";
      SD.adminStats(u, p).then(function (r) {
        if (!r.ok) return renderLogin(r.error);
        session = { u: u, p: p, data: r.data }; tab = "overview"; render();
      });
    });
  }

  function render() {
    var c = compute(session.data), maxDay = Math.max.apply(null, c.days.map(function (d) { return d.n; }).concat([1]));
    var tabs = [["overview", "Tổng quan"], ["reviews", "Đánh giá (" + c.n + ")"], ["traffic", "Truy cập"]];
    var html = (SD.isBackend ? "" : '<p class="adm-note">Chế độ thử nghiệm: dữ liệu chỉ lưu trong trình duyệt này. Hãy kết nối Google Sheet để xem dữ liệu của mọi người truy cập.</p>') +
      '<div class="adm-tabs" role="tablist">' + tabs.map(function (t) { return '<button role="tab" class="adm-tab' + (t[0] === tab ? " on" : "") + '" data-tab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + "</button>"; }).join("") + "</div>";

    if (tab === "overview") {
      var st = function (ic, n, l) { return '<div class="adm-stat">' + svg(ic) + "<b>" + fmt(n) + "</b><span>" + l + "</span></div>"; };
      var fmax = c.feats.length ? c.feats[0][1] : 0;
      html += '<div class="adm-stats">' + st("eye", c.total, "Tổng lượt truy cập") + st("users", c.unique, "Người truy cập") + st("eye", c.today, "Lượt hôm nay") + st("msg", c.n, "Số đánh giá") + "</div>" +
        '<div class="adm-grid"><div class="adm-card"><div class="adm-avg"><b>' + (c.n ? c.avg.toFixed(1).replace(".", ",") : "–") + "</b><div>" + stars(c.avg) + "<small>Điểm trung bình (" + c.n + " đánh giá)</small></div></div>" +
        [5, 4, 3, 2, 1].map(function (i) { return bar(i + " sao", c.dist[i] || 0, c.n); }).join("") + "</div>" +
        '<div class="adm-card"><h3>Điểm theo tiêu chí</h3>' + c.crit.map(function (x) { return '<div class="adm-crit"><span>' + x[0] + "</span>" + stars(x[1]) + "<b>" + (x[1] ? x[1].toFixed(1).replace(".", ",") : "–") + "</b></div>"; }).join("") +
        "<h3>Nội dung được thích nhất</h3>" + (c.feats.length ? c.feats.slice(0, 7).map(function (x) { return bar(x[0], x[1], fmax); }).join("") : '<p class="adm-empty">Chưa có dữ liệu.</p>') + "</div></div>" +
        '<div class="adm-card"><h3>Lượt truy cập 14 ngày gần nhất</h3><div class="adm-chart">' + c.days.map(function (d) {
          return '<div class="adm-col"><b>' + (d.n || "") + '</b><div class="adm-colwrap"><u style="height:' + Math.round(d.n / maxDay * 100) + '%"></u></div><span>' + d.label + "</span></div>";
        }).join("") + "</div></div>";
    } else if (tab === "reviews") {
      html += c.reviews.length ? '<div class="adm-reviews">' + c.reviews.map(function (r) {
        return '<article class="adm-review"><header>' + stars(+r.overall) + "<b>" + r.overall + "/5</b><time>" + esc(new Date(r.t).toLocaleString("vi-VN")) + " · " + esc(r.device || "") + "</time></header>" +
          '<p class="adm-sub">Giao diện ' + (+r.giaoDien || "–") + " · Tốc độ " + (+r.tocDo || "–") + " · Dễ sử dụng " + (+r.deSuDung || "–") + " · Tính năng " + (+r.tinhNang || "–") + "</p>" +
          ((r.features || []).length ? '<p class="adm-chips">' + r.features.map(function (f) { return "<span>" + esc(f) + "</span>"; }).join("") + "</p>" : "") +
          (r.comment ? '<p class="adm-comment">' + esc(r.comment) + "</p>" : "") + "</article>";
      }).join("") + "</div>" : '<p class="adm-empty">Chưa có đánh giá nào.</p>';
    } else {
      var pmax = c.pages.length ? c.pages[0][1] : 0;
      html += '<div class="adm-grid"><div class="adm-card"><h3>Lượt xem theo trang</h3>' + (c.pages.length ? c.pages.map(function (p) { return bar(p[0], p[1], pmax); }).join("") : '<p class="adm-empty">Chưa có dữ liệu.</p>') + "</div>" +
        '<div class="adm-card"><h3>Truy cập gần đây</h3><div class="adm-list">' + c.recent.map(function (v) {
          return "<div><time>" + esc(new Date(v.t).toLocaleString("vi-VN")) + "</time><span>" + esc(v.page) + "</span><span>" + esc(v.device) + "</span><code>" + esc(String(v.vid).slice(0, 6)) + "</code></div>";
        }).join("") + "</div></div></div>";
    }
    var keepScroll = dlg.scrollTop;
    dlg.innerHTML = shell(html, true);
    dlg.scrollTop = keepScroll;
  }

  dlg.addEventListener("click", function (e) {
    if (e.target === dlg) return dlg.close();
    var t = e.target.closest("[data-tab]");
    if (t) { tab = t.dataset.tab; return render(); }
    var a = e.target.closest("[data-act]"); if (!a) return;
    if (a.dataset.act === "close") dlg.close();
    if (a.dataset.act === "logout") { session = null; renderLogin(); }
    if (a.dataset.act === "refresh") {
      a.disabled = true;
      SD.adminStats(session.u, session.p).then(function (r) { if (r.ok) { session.data = r.data; render(); } else { session = null; renderLogin(r.error); } });
    }
  });
  var open = function () { dlg.showModal(); if (session) render(); else renderLogin(); };
  openBtn.addEventListener("click", open);
  document.addEventListener("keydown", function (e) { if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")) { e.preventDefault(); open(); } });
})();
