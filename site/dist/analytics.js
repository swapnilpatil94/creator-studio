// First-party event tracking for the Hub's "what do people read" questions. Sends GA4 events through gtag and mirrors them to dataLayer for GTM.
(function () {
  var send = function (name, params) { try { params = params || {}; params.page_language = document.documentElement.lang; if (window.gtag) gtag("event", name, params); (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: "k_" + name }, params)); } catch (e) {} };
  // scroll depth, once per level
  var marks = [25, 50, 75, 90], done = {}, art = document.querySelector("article");
  if (art) addEventListener("scroll", function () { var r = art.getBoundingClientRect(), pct = Math.round(((innerHeight - r.top) / r.height) * 100); marks.forEach(function (m) { if (pct >= m && !done[m]) { done[m] = 1; send("scroll_depth", { percent: m, path: location.pathname }); } }); }, { passive: true });
  // quiz answers (the quiz component dispatches this event)
  document.addEventListener("quiz:answer", function (e) { send("quiz_answer", { correct: e.detail.correct, dwell_ms: e.detail.dwell_ms, path: location.pathname }); });
  // share buttons, language switch, outbound links
  document.addEventListener("click", function (e) { var a = e.target.closest("a"); if (!a) return; var h = a.href || "";
    if (/wa\.me|facebook\.com\/sharer|twitter\.com\/intent/.test(h)) send("share", { method: /wa\.me/.test(h) ? "whatsapp" : /facebook/.test(h) ? "facebook" : "x", path: location.pathname });
    else if (a.hreflang && a.closest("details")) send("language_switch", { to: a.lang });
    else if (a.host && a.host !== location.host) send("outbound_click", { host: a.host }); });
  // video plays (reel embeds)
  document.querySelectorAll("video").forEach(function (v) { var fired = 0; v.addEventListener("play", function () { if (!fired) { fired = 1; send("video_start", { src: v.currentSrc.split("/").pop() }); } }); v.addEventListener("ended", function () { send("video_complete", { src: v.currentSrc.split("/").pop() }); }); });
})();
