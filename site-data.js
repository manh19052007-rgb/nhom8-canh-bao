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
    likes: "n8_likes",
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
      if (onDev) return Promise.resolve();
      return post({
        action: "visit",
        vid: rec.vid,
        page: rec.page,
        device: rec.device,
      })
        .then(function (r) {
          return r.json();
        })
        .catch(function () {});
    }
    push(K.visits, rec, 5000);
    return Promise.resolve();
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

  /* ---------- Lượt xem và lượt tim của từng trang sản phẩm ---------- */
  function likedLocal() {
    return !!read(K.likes, {})[pageName()];
  }
  function setLikedLocal(v) {
    var m = read(K.likes, {});
    if (v) m[pageName()] = 1;
    else delete m[pageName()];
    write(K.likes, m);
  }
  function pageStats() {
    var page = pageName();
    if (BACKEND_URL) {
      return post({ action: "pageStats", page: page, vid: vid() })
        .then(function (r) {
          return r.json();
        })
        .then(function (j) {
          return j.ok
            ? { views: j.views, likes: j.likes, liked: !!j.liked, local: false }
            : null;
        })
        .catch(function () {
          return null;
        });
    }
    var v = read(K.visits, []).filter(function (x) {
      return x.page === page;
    }).length;
    return Promise.resolve({
      views: v,
      likes: likedLocal() ? 1 : 0,
      liked: likedLocal(),
      local: true,
    });
  }
  function toggleLike(want) {
    if (BACKEND_URL) {
      return post({ action: "like", page: pageName(), vid: vid(), on: want })
        .then(function (r) {
          return r.json();
        })
        .then(function (j) {
          return j.ok ? { likes: j.likes, liked: !!j.liked } : null;
        })
        .catch(function () {
          return null;
        });
    }
    setLikedLocal(want);
    return Promise.resolve({ likes: want ? 1 : 0, liked: want });
  }
  function burst(btn) {
    if (
      window.matchMedia &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    for (var i = 0; i < 7; i++) {
      var h = document.createElement("i");
      h.className = "heart-fx";
      h.textContent = "♥";
      h.style.setProperty("--dx", Math.random() * 90 - 45 + "px");
      h.style.setProperty("--dy", -48 - Math.random() * 56 + "px");
      h.style.animationDelay = i * 40 + "ms";
      btn.appendChild(h);
      (function (el) {
        setTimeout(function () {
          el.remove();
        }, 1100);
      })(h);
    }
  }
  function initStats(tracked) {
    var vEl = document.getElementById("statViews");
    if (!vEl) return;
    var lEl = document.getElementById("statLikes"),
      btn = document.getElementById("likeBtn"),
      note = document.getElementById("statNote");
    var fmt = function (n) {
      return Number(n || 0).toLocaleString("vi-VN");
    };
    var state = { views: 0, likes: 0, liked: likedLocal() };
    var paint = function () {
      vEl.textContent = fmt(state.views);
      lEl.textContent = fmt(state.likes);
      btn.classList.toggle("liked", state.liked);
      btn.setAttribute("aria-pressed", state.liked);
    };
    tracked.then(pageStats).then(function (r) {
      if (!r) {
        vEl.textContent = "–";
        lEl.textContent = "–";
        return;
      }
      state = r;
      paint();
      if (note) note.hidden = !r.local;
    });
    btn.addEventListener("click", function () {
      var want = !state.liked;
      state.liked = want;
      state.likes = Math.max(0, state.likes + (want ? 1 : -1));
      paint();
      if (want) burst(btn);
      toggleLike(want).then(function (r) {
        if (r) {
          state.likes = r.likes;
          state.liked = r.liked;
          paint();
        }
      });
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
  initStats(track());
})();
