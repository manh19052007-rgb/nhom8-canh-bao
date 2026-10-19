/* ============================================================
   DỮ LIỆU TRUY CẬP & ĐÁNH GIÁ
   - BACKEND_URL để trống: chế độ thử nghiệm, dữ liệu chỉ lưu trong trình duyệt này.
   - Dán link "Web app" của Google Apps Script vào BACKEND_URL để lưu dữ liệu của mọi người truy cập
     (xem hướng dẫn trong file google-apps-script.gs).
   ============================================================ */
(function () {
  "use strict";
  var BACKEND_URL =
    "https://script.google.com/macros/s/AKfycbzA6RWr_F91tBoRLnFg0NcXAOWeHKZLbRU9oUzBW2Ci-_w-QRSMH0WGqEAhxAlYQ8_1/exec";
  var LOCAL_ADMIN_HASH =
    "0897cd4cfb4c0d10c2004472a74e745fcef9f653adaa103577bb78c1592c63ef"; /* chỉ dùng ở chế độ thử nghiệm */
  var K = {
    vid: "n8_vid",
    visits: "n8_visits",
    ratings: "n8_ratings",
    rated: "n8_rated",
  };
  var PAGES = {
    index: "Trang chủ",
    game: "Game",
    video: "Video",
    poster: "Poster",
    "khao-sat": "Khảo sát",
  };
  var onDev =
    location.protocol === "file:" ||
    /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  function read(k, d) {
    try {
      var v = JSON.parse(localStorage.getItem(k));
      return v == null ? d : v;
    } catch (e) {
      return d;
    }
  }
  function write(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  }
  function push(k, rec, max) {
    var a = read(k, []);
    a.push(rec);
    if (a.length > max) a = a.slice(-max);
    write(k, a);
  }
  function vid() {
    var id = read(K.vid, null);
    if (!id) {
      id =
        window.crypto && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now()) + Math.random().toString(16).slice(2);
      write(K.vid, id);
    }
    return id;
  }
  function pageName() {
    var f =
      location.pathname
        .split("/")
        .pop()
        .replace(/\.html$/, "") || "index";
    return PAGES[f] || f;
  }
  function device() {
    return (window.matchMedia && matchMedia("(pointer: coarse)").matches) ||
      innerWidth < 768
      ? "Điện thoại"
      : "Máy tính";
  }
  function post(payload, opts) {
    return fetch(
      BACKEND_URL,
      Object.assign(
        {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        },
        opts || {},
      ),
    );
  }
  function sha(text) {
    return crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(text))
      .then(function (b) {
        return Array.prototype.map
          .call(new Uint8Array(b), function (x) {
            return ("0" + x.toString(16)).slice(-2);
          })
          .join("");
      });
  }

  function track() {
    var rec = {
      t: new Date().toISOString(),
      vid: vid(),
      page: pageName(),
      device: device(),
    };
    if (BACKEND_URL) {
      if (!onDev)
        post(
          { action: "visit", vid: rec.vid, page: rec.page, device: rec.device },
          { mode: "no-cors", keepalive: true },
        ).catch(function () {});
    } else push(K.visits, rec, 5000);
  }
  function submitRating(r) {
    r.vid = vid();
    r.t = new Date().toISOString();
    r.device = device();
    if (!BACKEND_URL) {
      push(K.ratings, r, 500);
      return Promise.resolve(true);
    }
    return post(Object.assign({ action: "rating" }, r))
      .then(function (res) {
        return res.json();
      })
      .then(function (j) {
        return !!j.ok;
      })
      .catch(function () {
        return false;
      });
  }
  function adminStats(user, pass) {
    if (BACKEND_URL) {
      return post({ action: "stats", user: user, pass: pass })
        .then(function (r) {
          return r.json();
        })
        .then(function (j) {
          return j.ok
            ? { ok: true, data: j }
            : {
                ok: false,
                error:
                  j.error === "auth"
                    ? "Sai tài khoản hoặc mật khẩu."
                    : "Không đọc được dữ liệu.",
              };
        })
        .catch(function () {
          return { ok: false, error: "Không kết nối được máy chủ dữ liệu." };
        });
    }
    if (!(window.crypto && crypto.subtle))
      return Promise.resolve({
        ok: false,
        error: "Hãy mở trang bằng Live Server hoặc https để đăng nhập.",
      });
    return sha(user + ":" + pass).then(function (h) {
      if (h !== LOCAL_ADMIN_HASH)
        return { ok: false, error: "Sai tài khoản hoặc mật khẩu." };
      var v = read(K.visits, []),
        u = {};
      v.forEach(function (x) {
        u[x.vid] = 1;
      });
      return {
        ok: true,
        data: {
          totalViews: v.length,
          uniqueVisitors: Object.keys(u).length,
          visits: v,
          ratings: read(K.ratings, []),
        },
      };
    });
  }

  window.SiteData = {
    isBackend: !!BACKEND_URL,
    submitRating: submitRating,
    adminStats: adminStats,
    hasRated: function () {
      return !!read(K.rated, false);
    },
    markRated: function () {
      write(K.rated, true);
    },
  };
  track();
})();
