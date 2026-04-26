/* ============================================================
   AllergenGuard — API Client (content-script side)
   Sends ingredient text to the background service worker, which
   forwards it to the FastAPI backend's /check-ingredients route.

   We go through the service worker (not direct fetch) because
   content-script fetches inherit the host page's CORS rules in
   MV3 — meaning amazon.com → localhost:8000 would be blocked
   regardless of what the backend's CORS headers say.

   Returns: { status, flagged_allergens, count } on success,
            null on any failure (timeout, backend down, etc.)
   ============================================================ */

function ag_apiCheckIngredients(ingredientsText) {
  return new Promise(function (resolve) {
    if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
      resolve(null);
      return;
    }

    try {
      chrome.runtime.sendMessage(
        { type: "AG_CHECK_INGREDIENTS", ingredients: ingredientsText || "" },
        function (response) {
          if (chrome.runtime.lastError) {
            console.warn("[AllergenGuard] Backend bridge error:", chrome.runtime.lastError.message);
            resolve(null);
            return;
          }
          if (!response || !response.ok) {
            console.warn("[AllergenGuard] Backend error:", response && response.error);
            resolve(null);
            return;
          }
          resolve(response.data);
        }
      );
    } catch (err) {
      console.warn("[AllergenGuard] sendMessage failed:", err);
      resolve(null);
    }
  });
}

window.AG_apiCheckIngredients = ag_apiCheckIngredients;
