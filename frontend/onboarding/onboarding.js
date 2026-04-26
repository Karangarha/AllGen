/* ============================================================
   AllergenGuard — Onboarding Controller
   The "brain" of the welcome tour.

   Responsibilities:
     1. Render the 9 allergen cards on screen 4
     2. Handle screen-to-screen navigation (Next, Back)
     3. Update progress dots as user advances
     4. Track selected allergens in memory
     5. Update live counter and enable/disable Continue
     6. Personalize the screen 5 summary
     7. Save selections to chrome.storage.local on finish

   Depends on:
     - shared/allergen-data.js (window.AG_ALLERGENS)
   ============================================================ */


/* ------------------------------------------------------------
   1. STATE — single source of truth for the entire flow
   currentStep: which screen the user is on (1–5)
   selectedAllergens: array of allergen IDs the user has picked
   ------------------------------------------------------------ */
const state = {
  currentStep: 1,
  selectedAllergens: []
};


/* ------------------------------------------------------------
   2. APPLY SAVED THEME
   Read the user's theme preference (light/dark) from storage
   and apply it to the page. Without this, dark mode users
   would see the onboarding flash white before correcting.
   ------------------------------------------------------------ */
function applySavedTheme() {
  if (!chrome || !chrome.storage || !chrome.storage.local) return;

  chrome.storage.local.get(["theme"], function (data) {
    const theme = (data && data.theme) || "light";
    document.documentElement.setAttribute("data-theme", theme);
  });
}


/* ------------------------------------------------------------
   3. RENDER ALLERGEN GRID (screen 4)
   Builds 9 selectable cards from the allergen notebook.
   Each card has the emoji, label, and an empty checkmark
   that becomes visible when selected.
   ------------------------------------------------------------ */
function renderAllergenGrid() {
  const grid = document.getElementById("ag-allergen-grid");
  if (!grid) return;

  const allergens = window.AG_ALLERGENS || [];

  // Build a card for each allergen
  allergens.forEach(function (allergen) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "ag-onboard__card";
    card.dataset.allergenId = allergen.id;
    card.setAttribute("aria-pressed", "false");
    card.setAttribute("aria-label", "Select " + allergen.label);

    // Selection checkmark (hidden by default via CSS)
    const check = document.createElement("span");
    check.className = "ag-onboard__card-check";
    check.setAttribute("aria-hidden", "true");
    check.textContent = "✓";
    card.appendChild(check);

    // Emoji
    const emoji = document.createElement("span");
    emoji.className = "ag-onboard__card-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = allergen.emoji;
    card.appendChild(emoji);

    // Label
    const label = document.createElement("span");
    label.className = "ag-onboard__card-label";
    label.textContent = allergen.label;
    card.appendChild(label);

    // Clicking the card toggles selection
    card.addEventListener("click", function () {
      toggleAllergen(allergen.id, card);
    });

    grid.appendChild(card);
  });
}


/* ------------------------------------------------------------
   4. TOGGLE AN ALLERGEN SELECTION
   Adds or removes the allergen from state.selectedAllergens
   and updates the card's visual state.
   ------------------------------------------------------------ */
function toggleAllergen(id, card) {
  const index = state.selectedAllergens.indexOf(id);

  if (index === -1) {
    // Not selected yet — add it
    state.selectedAllergens.push(id);
    card.classList.add("is-selected");
    card.setAttribute("aria-pressed", "true");
  } else {
    // Already selected — remove it
    state.selectedAllergens.splice(index, 1);
    card.classList.remove("is-selected");
    card.setAttribute("aria-pressed", "false");
  }

  updateSelectionCounter();
  updateContinueButton();
}


/* ------------------------------------------------------------
   5. UPDATE THE LIVE SELECTION COUNTER
   Shows "0 selected" / "1 selected" / "All 9 selected".
   ------------------------------------------------------------ */
function updateSelectionCounter() {
  const counter = document.getElementById("ag-onboard-count");
  if (!counter) return;

  const count = state.selectedAllergens.length;
  const total = (window.AG_ALLERGENS || []).length;

  if (count === 0) {
    counter.textContent = "0 selected";
  } else if (count === total) {
    counter.textContent = "All " + total + " selected";
  } else {
    counter.textContent = count + " selected";
  }
}


/* ------------------------------------------------------------
   6. ENABLE / DISABLE THE CONTINUE BUTTON ON SCREEN 4
   User must pick at least 1 allergen before continuing.
   ------------------------------------------------------------ */
function updateContinueButton() {
  const btn = document.getElementById("ag-onboard-continue-4");
  if (!btn) return;

  btn.disabled = state.selectedAllergens.length === 0;
}


/* ------------------------------------------------------------
   7. SHOW A SPECIFIC SCREEN
   Hides all screens, then shows the target. Also updates
   progress dots and updates state.currentStep.
   ------------------------------------------------------------ */
function showScreen(stepNumber) {
  // Update state first
  state.currentStep = stepNumber;

  // Hide all screens
  const screens = document.querySelectorAll(".ag-onboard__screen");
  screens.forEach(function (screen) {
    screen.hidden = true;
  });

  // Show the target screen
  const target = document.getElementById("ag-screen-" + stepNumber);
  if (target) {
    target.hidden = false;
  }

  // Update progress dots
  updateProgressDots(stepNumber);

  // Special case: when entering screen 5, populate summary
  if (stepNumber === 5) {
    updateSummary();
  }

  // Scroll to top — useful if user has scrolled within a screen
  window.scrollTo({ top: 0, behavior: "smooth" });
}


/* ------------------------------------------------------------
   8. UPDATE PROGRESS DOTS
   Marks the dot for the active screen and removes the
   active class from all others.
   ------------------------------------------------------------ */
function updateProgressDots(stepNumber) {
  const dots = document.querySelectorAll(".ag-onboard__dot");

  dots.forEach(function (dot) {
    const dotStep = parseInt(dot.dataset.step, 10);

    if (dotStep === stepNumber) {
      dot.classList.add("ag-onboard__dot--active");
      dot.setAttribute("aria-current", "step");
    } else {
      dot.classList.remove("ag-onboard__dot--active");
      dot.removeAttribute("aria-current");
    }
  });
}


/* ------------------------------------------------------------
   9. UPDATE THE SCREEN 5 SUMMARY
   Replaces "your allergens" with the actual list of picked
   allergens (e.g. "Milk, Peanuts, and Eggs").
   ------------------------------------------------------------ */
function updateSummary() {
  const summary = document.getElementById("ag-onboard-summary");
  if (!summary) return;

  const ids = state.selectedAllergens;
  if (ids.length === 0) {
    summary.textContent = "your allergens";
    return;
  }

  // Look up labels from the notebook
  const labels = ids.map(function (id) {
    const allergen = window.AG_getAllergenById(id);
    return allergen ? allergen.label : "";
  }).filter(function (l) { return l !== ""; });

  // Format as natural English: "Milk", "Milk and Eggs",
  // or "Milk, Eggs, and Peanuts"
  let text;
  if (labels.length === 1) {
    text = labels[0];
  } else if (labels.length === 2) {
    text = labels[0] + " and " + labels[1];
  } else {
    const last = labels[labels.length - 1];
    const rest = labels.slice(0, -1).join(", ");
    text = rest + ", and " + last;
  }

  summary.textContent = text;
}


/* ------------------------------------------------------------
   10. NAVIGATION HANDLERS
   "Next" advances to the next screen.
   "Back" goes to the previous screen.
   Caps at 1 (lowest) and 5 (highest).
   ------------------------------------------------------------ */
function goNext() {
  if (state.currentStep < 5) {
    showScreen(state.currentStep + 1);
  }
}

function goBack() {
  if (state.currentStep > 1) {
    showScreen(state.currentStep - 1);
  }
}


/* ------------------------------------------------------------
   11. SAVE & FINISH
   Saves the user's allergen selections to chrome.storage,
   then closes the onboarding tab so they can start browsing.
   ------------------------------------------------------------ */
function finishOnboarding() {
  if (!chrome || !chrome.storage || !chrome.storage.local) {
    // Storage unavailable — close tab anyway
    window.close();
    return;
  }

  const data = {
    userAllergens: state.selectedAllergens,
    onboardingComplete: true,
    onboardingCompletedAt: new Date().toISOString()
  };

  chrome.storage.local.set(data, function () {
    // After storage saves, close the onboarding tab
    window.close();
  });
}


/* ------------------------------------------------------------
   12. EVENT DELEGATION FOR NEXT / BACK BUTTONS
   One listener on the whole onboarding container catches
   every button click. Reads data-action to decide what to do.
   This means we don't have to attach listeners to each button
   individually.
   ------------------------------------------------------------ */
function attachNavigationListeners() {
  const root = document.querySelector(".ag-onboard");
  if (!root) return;

  root.addEventListener("click", function (event) {
    // Bubble up from the click target until we find a button
    // with a data-action attribute
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    if (action === "next") goNext();
    if (action === "back") goBack();
  });

  // The final "Start Browsing" button has its own ID
  const finishBtn = document.getElementById("ag-onboard-finish");
  if (finishBtn) {
    finishBtn.addEventListener("click", finishOnboarding);
  }
}


/* ------------------------------------------------------------
   13. KEYBOARD NAVIGATION
   Lets users press Enter to advance and Esc to go back.
   Small accessibility win — keyboard users get parity with
   mouse users.
   ------------------------------------------------------------ */
function attachKeyboardListeners() {
  document.addEventListener("keydown", function (event) {
    // Don't intercept if user is interacting with form fields
    if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
      return;
    }

    if (event.key === "Escape" && state.currentStep > 1) {
      event.preventDefault();
      goBack();
    }
  });
}


/* ------------------------------------------------------------
   14. INIT — runs everything in the right order
   ------------------------------------------------------------ */
function init() {
  applySavedTheme();
  renderAllergenGrid();
  attachNavigationListeners();
  attachKeyboardListeners();
  showScreen(1);   // Always start at screen 1
}


/* ------------------------------------------------------------
   15. KICKOFF
   ------------------------------------------------------------ */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}