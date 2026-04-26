/* ============================================================
   AllergenGuard — Settings Controller
   The "brain" of the settings page.

   Responsibilities:
     1. Load user's allergens and theme from storage
     2. Render the 9 allergen cards with current selections
     3. Auto-save on every card toggle
     4. Switch themes instantly with auto-save
     5. Show "Saved ✓" pill after each write
     6. Handle reset confirmation modal
     7. Clear storage and reopen onboarding on reset

   Depends on:
     - shared/allergen-data.js (window.AG_ALLERGENS, window.AG_getAllergenById)
   ============================================================ */


/* ------------------------------------------------------------
   1. STATE — single source of truth
   selectedAllergens: array of allergen IDs the user has active
   currentTheme: "light" or "dark"
   ------------------------------------------------------------ */
const state = {
  selectedAllergens: [],
  currentTheme: "light"
};


/* ------------------------------------------------------------
   2. STORAGE HELPERS
   Promise-wrapped Chrome storage reads and writes.
   ------------------------------------------------------------ */
function loadFromStorage() {
  return new Promise(function (resolve) {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      resolve({ userAllergens: [], theme: "light" });
      return;
    }
    chrome.storage.local.get(["userAllergens", "theme"], function (data) {
      resolve({
        userAllergens: (data && data.userAllergens) || [],
        theme: (data && data.theme) || "light"
      });
    });
  });
}

function saveToStorage(updates) {
  return new Promise(function (resolve) {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      resolve(false);
      return;
    }
    chrome.storage.local.set(updates, function () {
      resolve(true);
    });
  });
}


/* ------------------------------------------------------------
   3. APPLY THEME TO PAGE
   Sets data-theme on <html>, which triggers theme.css
   variable swaps. Also updates the active theme button.
   ------------------------------------------------------------ */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  state.currentTheme = theme;

  // Update active button styling
  const lightBtn = document.getElementById("ag-theme-light");
  const darkBtn  = document.getElementById("ag-theme-dark");

  if (lightBtn && darkBtn) {
    if (theme === "dark") {
      lightBtn.classList.remove("ag-settings__theme-btn--active");
      lightBtn.setAttribute("aria-pressed", "false");
      darkBtn.classList.add("ag-settings__theme-btn--active");
      darkBtn.setAttribute("aria-pressed", "true");
    } else {
      darkBtn.classList.remove("ag-settings__theme-btn--active");
      darkBtn.setAttribute("aria-pressed", "false");
      lightBtn.classList.add("ag-settings__theme-btn--active");
      lightBtn.setAttribute("aria-pressed", "true");
    }
  }
}


/* ------------------------------------------------------------
   4. RENDER ALLERGEN GRID
   Builds 9 cards. Pre-selects ones already in state.
   ------------------------------------------------------------ */
function renderAllergenGrid() {
  const grid = document.getElementById("ag-settings-grid");
  if (!grid) return;

  // Clear in case this ever runs twice
  grid.innerHTML = "";

  const allergens = window.AG_ALLERGENS || [];

  allergens.forEach(function (allergen) {
    const isSelected = state.selectedAllergens.indexOf(allergen.id) !== -1;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "ag-settings__card";
    if (isSelected) card.classList.add("is-selected");
    card.dataset.allergenId = allergen.id;
    card.setAttribute("aria-pressed", isSelected ? "true" : "false");
    card.setAttribute("aria-label", "Toggle " + allergen.label);

    // Selection checkmark
    const check = document.createElement("span");
    check.className = "ag-settings__card-check";
    check.setAttribute("aria-hidden", "true");
    check.textContent = "✓";
    card.appendChild(check);

    // Emoji
    const emoji = document.createElement("span");
    emoji.className = "ag-settings__card-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = allergen.emoji;
    card.appendChild(emoji);

    // Label
    const label = document.createElement("span");
    label.className = "ag-settings__card-label";
    label.textContent = allergen.label;
    card.appendChild(label);

    // Click toggles selection AND auto-saves
    card.addEventListener("click", function () {
      toggleAllergen(allergen.id, card);
    });

    grid.appendChild(card);
  });
}


/* ------------------------------------------------------------
   5. TOGGLE AN ALLERGEN AND AUTO-SAVE
   Updates state, updates visual, saves to storage,
   flashes the "Saved" pill.
   ------------------------------------------------------------ */
function toggleAllergen(id, card) {
  const index = state.selectedAllergens.indexOf(id);

  if (index === -1) {
    state.selectedAllergens.push(id);
    card.classList.add("is-selected");
    card.setAttribute("aria-pressed", "true");
  } else {
    state.selectedAllergens.splice(index, 1);
    card.classList.remove("is-selected");
    card.setAttribute("aria-pressed", "false");
  }

  updateCount();

  // Persist immediately
  saveToStorage({ userAllergens: state.selectedAllergens })
    .then(function (success) {
      if (success) flashSavePill();
    });
}


/* ------------------------------------------------------------
   6. UPDATE LIVE COUNT
   "0 allergens active" / "1 allergen active" / "9 allergens active"
   ------------------------------------------------------------ */
function updateCount() {
  const counter = document.getElementById("ag-settings-count");
  if (!counter) return;

  const count = state.selectedAllergens.length;
  const word = count === 1 ? "allergen" : "allergens";
  counter.textContent = count + " " + word + " active";
}


/* ------------------------------------------------------------
   7. FLASH THE "SAVED" PILL
   Shows the pill, lets the CSS animation play (1.5s),
   then hides it. Re-triggerable by removing the hidden
   attribute and re-adding it (forces animation restart).
   ------------------------------------------------------------ */
let savePillTimer = null;

function flashSavePill() {
  const pill = document.getElementById("ag-save-pill");
  if (!pill) return;

  // Cancel any pending hide so rapid changes don't get cut off
  if (savePillTimer) {
    clearTimeout(savePillTimer);
    savePillTimer = null;
  }

  // Force CSS animation to restart by toggling hidden + reflow
  pill.hidden = true;
  void pill.offsetWidth;   // forces a layout reflow
  pill.hidden = false;

  // Hide after the animation completes (1.5s)
  savePillTimer = setTimeout(function () {
    pill.hidden = true;
    savePillTimer = null;
  }, 1500);
}


/* ------------------------------------------------------------
   8. THEME BUTTON HANDLER
   Switches the theme and saves it.
   ------------------------------------------------------------ */
function attachThemeHandlers() {
  const lightBtn = document.getElementById("ag-theme-light");
  const darkBtn  = document.getElementById("ag-theme-dark");

  if (lightBtn) {
    lightBtn.addEventListener("click", function () {
      if (state.currentTheme === "light") return;  // already active
      applyTheme("light");
      saveToStorage({ theme: "light" }).then(function (success) {
        if (success) flashSavePill();
      });
    });
  }

  if (darkBtn) {
    darkBtn.addEventListener("click", function () {
      if (state.currentTheme === "dark") return;
      applyTheme("dark");
      saveToStorage({ theme: "dark" }).then(function (success) {
        if (success) flashSavePill();
      });
    });
  }
}


/* ------------------------------------------------------------
   9. RESET FLOW
   Open the modal, wait for confirmation, then wipe storage
   and redirect to onboarding.
   ------------------------------------------------------------ */
function attachResetHandlers() {
  const resetBtn       = document.getElementById("ag-settings-reset");
  const modal          = document.getElementById("ag-confirm");
  const backdrop       = document.getElementById("ag-confirm-backdrop");
  const cancelBtn      = document.getElementById("ag-confirm-cancel");
  const confirmYesBtn  = document.getElementById("ag-confirm-yes");

  if (!resetBtn || !modal) return;

  // Open modal
  resetBtn.addEventListener("click", function () {
    modal.hidden = false;
    // Move keyboard focus to Cancel (the safe default)
    if (cancelBtn) cancelBtn.focus();
  });

  // Close modal helper
  function closeModal() {
    modal.hidden = true;
  }

  // Cancel and backdrop click → close modal
  if (cancelBtn)  cancelBtn.addEventListener("click", closeModal);
  if (backdrop)   backdrop.addEventListener("click", closeModal);

  // Yes, reset → wipe storage and reopen onboarding
  if (confirmYesBtn) {
    confirmYesBtn.addEventListener("click", function () {
      performReset();
    });
  }

  // Escape key closes modal
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });
}


function performReset() {
  if (!chrome || !chrome.storage || !chrome.storage.local) {
    return;
  }
  chrome.storage.local.clear(function () {
    // After clearing, send user to onboarding
    const onboardUrl = chrome.runtime.getURL("onboarding/onboarding.html");
    window.location.replace(onboardUrl);
  });
}


/* ------------------------------------------------------------
   10. INIT
   Loads saved data, applies theme, renders grid, wires up
   handlers — all in the right order.
   ------------------------------------------------------------ */
function init() {
  loadFromStorage().then(function (data) {
    // Hydrate state
    state.selectedAllergens = data.userAllergens.slice();   // copy to be safe
    state.currentTheme = data.theme;

    // Apply theme BEFORE rendering anything visible
    applyTheme(state.currentTheme);

    // Build the grid with current selections pre-applied
    renderAllergenGrid();

    // Update the count display
    updateCount();

    // Wire up theme buttons
    attachThemeHandlers();

    // Wire up reset flow
    attachResetHandlers();
  });
}


/* ------------------------------------------------------------
   11. KICKOFF
   ------------------------------------------------------------ */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}