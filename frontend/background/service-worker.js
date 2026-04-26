/* ============================================================
   AllergenGuard — Background Service Worker
   Proxies API calls to the local FastAPI backend so they go
   out with the extension's own origin (chrome-extension://...)
   instead of the host page's origin (amazon.com, ubereats.com).

   This is what gets us past CORS in MV3: content-script fetches
   inherit the host page's CORS rules, but service-worker fetches
   are first-party to the extension and respect host_permissions.

   Listens for: { type: "AG_CHECK_INGREDIENTS", ingredients }
   Replies with: { ok: true, data } or { ok: false, error }
   ============================================================ */

const AG_API_BASE = "http://127.0.0.1:8000";

chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
  if (!message || message.type !== "AG_CHECK_INGREDIENTS") {
    return false;
  }

  const ingredients = typeof message.ingredients === "string" ? message.ingredients : "";

  fetch(AG_API_BASE + "/check-ingredients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients: ingredients })
  })
    .then(function (res) {
      if (!res.ok) {
        throw new Error("Backend responded " + res.status);
      }
      return res.json();
    })
    .then(function (data) {
      sendResponse({ ok: true, data: data });
    })
    .catch(function (err) {
      sendResponse({ ok: false, error: err && err.message ? err.message : String(err) });
    });

  // Return true to keep the message channel open for the async sendResponse
  return true;
});
