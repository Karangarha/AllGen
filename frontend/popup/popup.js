/* ============================================================
   AllergenGuard — Popup Controller
   The "brain" of the toolbar popup.

   Flow:
     1. Wait for DOM to be ready
     2. Load user's allergens from Chrome storage
     3. Decide which state to show (configured vs. empty)
     4. Build the allergen chips
     5. Wire up button click handlers

   Depends on:
     - shared/allergen-data.js (window.AG_ALLERGENS, window.AG_getAllergenById)
   ============================================================ */


/* ------------------------------------------------------------
   1. LOAD USER'S ALLERGENS FROM CHROME STORAGE
   Returns a Promise so we can use async/await.
   Falls back to an empty array if storage is unavailable
   or the user hasn't configured anything yet.
   ------------------------------------------------------------ */
function loadUserAllergens() {
  return new Promise(function (resolve) {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      resolve([]);
      return;
    }
    chrome.storage.local.get(["userAllergens"], function (data) {
      const list = (data && data.userAllergens) || [];
      resolve(Array.isArray(list) ? list : []);
    });
  });
}


/* ------------------------------------------------------------
   2. DECIDE WHICH STATE TO SHOW
   If user has 1+ allergens → show configured state.
   If user has 0 allergens → show empty (Get Started) state.
   ------------------------------------------------------------ */
function showState(allergenIds) {
  const configuredEl = document.getElementById("ag-state-configured");
  const emptyEl      = document.getElementById("ag-state-empty");

  if (allergenIds.length > 0) {
    configuredEl.hidden = false;
    emptyEl.hidden = true;
  } else {
    configuredEl.hidden = true;
    emptyEl.hidden = false;
  }
}


/* ------------------------------------------------------------
   3. UPDATE THE STATUS COUNT TEXT
   Shows "1 allergen active" or "5 allergens active" etc.
   Handles singular vs plural correctly.
   ------------------------------------------------------------ */
function updateStatusCount(count) {
  const countEl = document.getElementById("ag-status-count");
  if (!countEl) return;

  const word = count === 1 ? "allergen" : "allergens";
  countEl.textContent = count + " " + word + " active";
}


/* ------------------------------------------------------------
   4. BUILD THE ALLERGEN CHIPS
   Reads the user's selected IDs, looks up each one in the
   notebook (allergen-data.js), and creates a chip element
   for each. Empties the container first so we don't double up
   if this function ever runs twice.
   ------------------------------------------------------------ */
function renderChips(allergenIds) {
  const container = document.getElementById("ag-popup-chips");
  if (!container) return;

  // Clear any existing chips (defensive)
  container.innerHTML = "";

  // Build one chip per allergen
  allergenIds.forEach(function (id) {
    const allergen = window.AG_getAllergenById(id);
    if (!allergen) return;  // Unknown ID — skip it

    const chip = document.createElement("span");
    chip.className = "ag-popup__chip";

    const emoji = document.createElement("span");
    emoji.className = "ag-popup__chip-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = allergen.emoji;
    chip.appendChild(emoji);

    const label = document.createElement("span");
    label.className = "ag-popup__chip-label";
    label.textContent = allergen.label;
    chip.appendChild(label);

    container.appendChild(chip);
  });
}


/* ------------------------------------------------------------
   5. NAVIGATION HELPERS
   Open onboarding or settings in a new browser tab.
   chrome.runtime.getURL converts an extension-relative path
   into a real chrome-extension:// URL the browser can open.
   ------------------------------------------------------------ */
function openOnboarding() {
  const url = chrome.runtime.getURL("onboarding/onboarding.html");
  chrome.tabs.create({ url: url });
  window.close();   // close the popup after starting the action
}

function openSettings() {
  const url = chrome.runtime.getURL("settings/settings.html");
  chrome.tabs.create({ url: url });
  window.close();
}


/* ------------------------------------------------------------
   6. WIRE UP CLICK HANDLERS
   Connects every button in the popup to its action.
   ------------------------------------------------------------ */
function attachEventListeners() {
  // Settings gear (top right) → open settings page
  const settingsBtn = document.getElementById("ag-popup-settings");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", openSettings);
  }

  // "Manage Allergens" button → open settings page
  const manageBtn = document.getElementById("ag-popup-manage");
  if (manageBtn) {
    manageBtn.addEventListener("click", openSettings);
  }

  // "Get Started" button → open onboarding flow
  const startBtn = document.getElementById("ag-popup-start");
  if (startBtn) {
    startBtn.addEventListener("click", openOnboarding);
  }
}


/* ------------------------------------------------------------
   7. APPLY SAVED THEME (light / dark)
   Reads the saved theme preference from storage and applies
   it to the <html> tag. Without this, the popup would always
   load in light mode regardless of what the user picked
   in settings.
   ------------------------------------------------------------ */
function applySavedTheme() {
  if (!chrome || !chrome.storage || !chrome.storage.local) return;

  chrome.storage.local.get(["theme"], function (data) {
    const theme = (data && data.theme) || "light";
    document.documentElement.setAttribute("data-theme", theme);
  });
}


/* ------------------------------------------------------------
   8. MAIN INIT FUNCTION
   Runs everything in the right order when the popup opens.
   ------------------------------------------------------------ */
function init() {
  // Apply theme immediately to avoid a flash of wrong colors
  applySavedTheme();

  // Wire up buttons (works regardless of state)
  attachEventListeners();

  // Load user's allergens, then update the UI
  loadUserAllergens().then(function (allergenIds) {
    showState(allergenIds);
    updateStatusCount(allergenIds.length);
    renderChips(allergenIds);
  });
}


/* ------------------------------------------------------------
   9. KICKOFF
   Wait for the DOM to be ready, then run init.
   "DOMContentLoaded" fires when HTML is parsed — faster than
   waiting for images and CSS to fully load.
   ------------------------------------------------------------ */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  // DOM is already ready (rare but possible)
  init();
}