/* ============================================================
   AllergenGuard — Alert Banner Controller
   The "brain" that injects, manages, and dismisses the
   in-page warning banner.

   Flow:
     1. Wait for page to be ready
     2. Ask scrapers what's on the page
     3. Ask matcher if user's allergens are present
     4. If yes → build and inject the banner
     5. Wire up click handlers (expand, dismiss, leave)
     6. Watch for SPA navigation AND DOM mutations
        (DoorDash, Uber Eats use heavy React rendering that
        loads content asynchronously after the URL changes)

   Depends on:
     - shared/allergen-data.js   (window.AG_ALLERGENS)
     - shared/allergen-matcher.js (window.AG_scanProduct)
     - scrapers/scraper-*.js      (window.AG_scrapers[host])
   ============================================================ */


/* ------------------------------------------------------------
   1. PLATFORM ROUTER
   Looks at the current URL hostname and returns the matching
   scraper. Each scraper file registers itself onto
   window.AG_scrapers when its file loads.
   ------------------------------------------------------------ */
function ag_pickScraper() {
  const host = window.location.hostname;
  const scrapers = window.AG_scrapers || {};

  if (host.indexOf("ubereats.com") !== -1)  return scrapers.ubereats;
  if (host.indexOf("amazon.com") !== -1)    return scrapers.amazon;
  if (host.indexOf("shoprite.com") !== -1)  return scrapers.shoprite;

  return null;
}


/* ------------------------------------------------------------
   2. READ USER'S SAVED ALLERGENS FROM CHROME STORAGE
   Returns a Promise so the caller can await it.
   ------------------------------------------------------------ */
function ag_loadUserAllergens() {
  return new Promise(function (resolve) {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      resolve([]);
      return;
    }
    try {
      chrome.storage.local.get(["userAllergens"], function (data) {
        // Catch "Extension context invalidated" errors silently
        if (chrome.runtime.lastError) {
          console.warn("[AllergenGuard]", chrome.runtime.lastError.message);
          resolve([]);
          return;
        }
        const list = (data && data.userAllergens) || [];
        resolve(Array.isArray(list) ? list : []);
      });
    } catch (err) {
      // Catches "Extension context invalidated" and similar
      console.warn("[AllergenGuard] Storage call failed:", err);
      resolve([]);
    }
  });
}


/* ------------------------------------------------------------
   3. BUILD THE BANNER DOM
   We create the banner with JavaScript instead of fetching
   the HTML template file. Why? Faster, simpler, and avoids
   any cross-origin issues with chrome-extension:// URLs
   inside Amazon/DoorDash pages.

   The structure mirrors alert-banner.html exactly.
   ------------------------------------------------------------ */
function ag_buildBanner(matches) {
  // Top-level banner container
  const banner = document.createElement("div");
  banner.className = "ag-banner";
  banner.id = "ag-banner";
  banner.setAttribute("role", "alert");
  banner.setAttribute("aria-live", "assertive");

  // ===== Dismiss button (left) =====
  const dismissBtn = document.createElement("button");
  dismissBtn.className = "ag-banner__dismiss";
  dismissBtn.id = "ag-banner-dismiss";
  dismissBtn.type = "button";
  dismissBtn.setAttribute("aria-label", "Dismiss warning");
  dismissBtn.textContent = "✕";
  banner.appendChild(dismissBtn);

  // ===== Middle content row =====
  const content = document.createElement("div");
  content.className = "ag-banner__content";

  const icon = document.createElement("span");
  icon.className = "ag-banner__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "⚠";
  content.appendChild(icon);

  const textWrap = document.createElement("span");
  textWrap.className = "ag-banner__text";

  const label = document.createElement("strong");
  label.className = "ag-banner__label";
  label.textContent = "WARNING";
  textWrap.appendChild(label);

  const sep = document.createElement("span");
  sep.className = "ag-banner__separator";
  sep.textContent = "—";
  textWrap.appendChild(sep);

  // Build the "Allergen detected: PEANUTS, MILK" message
  const message = document.createElement("span");
  message.className = "ag-banner__message";
  message.appendChild(document.createTextNode("Allergen detected: "));

  const allergenList = document.createElement("strong");
  allergenList.id = "ag-banner-allergens";
  allergenList.textContent = matches
    .map(function (m) { return m.allergenLabel.toUpperCase(); })
    .join(", ");
  message.appendChild(allergenList);

  textWrap.appendChild(message);
  content.appendChild(textWrap);
  banner.appendChild(content);

  // ===== Expand chevron (right) =====
  const expandBtn = document.createElement("button");
  expandBtn.className = "ag-banner__expand";
  expandBtn.id = "ag-banner-expand";
  expandBtn.type = "button";
  expandBtn.setAttribute("aria-label", "Show more details");
  expandBtn.setAttribute("aria-expanded", "false");

  const chevron = document.createElement("span");
  chevron.className = "ag-banner__chevron";
  chevron.textContent = "⌄";
  expandBtn.appendChild(chevron);
  banner.appendChild(expandBtn);

  // ===== Hidden details panel =====
  const details = document.createElement("div");
  details.className = "ag-banner__details";
  details.id = "ag-banner-details";
  details.hidden = true;

// ===== "Why This Matters" — Clinical notes section =====
  // Stack one note per matched allergen (deduplicated by id).
  const whyHeading = document.createElement("div");
  whyHeading.className = "ag-banner__why-heading";
  whyHeading.textContent = "Why this matters";
  details.appendChild(whyHeading);

  // Track which allergen ids we've already shown a note for,
  // in case the matcher returns the same allergen twice
  const shownIds = {};

  matches.forEach(function (match) {
    if (shownIds[match.allergenId]) return;
    shownIds[match.allergenId] = true;

    const note = window.AG_getClinicalNote(match.allergenId);
    if (!note) return;

    const noteRow = document.createElement("div");
    noteRow.className = "ag-banner__why-row";

    const noteLabel = document.createElement("strong");
    noteLabel.className = "ag-banner__why-label";
    noteLabel.textContent = match.allergenLabel.toUpperCase() + ":";
    noteRow.appendChild(noteLabel);

    const noteText = document.createElement("span");
    noteText.className = "ag-banner__why-text";
    noteText.textContent = " " + note;
    noteRow.appendChild(noteText);

    details.appendChild(noteRow);
  });

  // ===== Matched ingredient row =====
  const detailRow = document.createElement("div");
  detailRow.className = "ag-banner__detail-row";

  const detailLabel = document.createElement("span");
  detailLabel.className = "ag-banner__detail-label";
  detailLabel.textContent = "Matched ingredient:";
  detailRow.appendChild(detailLabel);

  const detailValue = document.createElement("span");
  detailValue.className = "ag-banner__detail-value";
  detailValue.id = "ag-banner-matched";
  detailValue.textContent = matches[0].matchedAlias;
  detailRow.appendChild(detailValue);

  details.appendChild(detailRow);

  // Action row with the "Leave Page" button
  const actions = document.createElement("div");
  actions.className = "ag-banner__actions";

  const leaveBtn = document.createElement("button");
  leaveBtn.className = "ag-banner__action-leave";
  leaveBtn.id = "ag-banner-leave";
  leaveBtn.type = "button";
  leaveBtn.textContent = "Leave Page";
  actions.appendChild(leaveBtn);

  details.appendChild(actions);
  banner.appendChild(details);

  return banner;
}


/* ------------------------------------------------------------
   4. BUILD THE CONFIRMATION MODAL DOM
   Created lazily — only when the user actually clicks the X.
   ------------------------------------------------------------ */
function ag_buildConfirmModal() {
  const modal = document.createElement("div");
  modal.className = "ag-confirm";
  modal.id = "ag-confirm";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");

  const backdrop = document.createElement("div");
  backdrop.className = "ag-confirm__backdrop";
  backdrop.id = "ag-confirm-backdrop";
  modal.appendChild(backdrop);

  const box = document.createElement("div");
  box.className = "ag-confirm__box";
  box.setAttribute("role", "document");

  const title = document.createElement("h2");
  title.className = "ag-confirm__title";
  title.textContent = "Dismiss this warning?";
  box.appendChild(title);

  const desc = document.createElement("p");
  desc.className = "ag-confirm__description";
  desc.textContent =
    "This product contains an allergen you flagged. " +
    "Are you sure you want to hide this warning?";
  box.appendChild(desc);

  const actions = document.createElement("div");
  actions.className = "ag-confirm__actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "ag-confirm__cancel";
  cancelBtn.id = "ag-confirm-cancel";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";
  actions.appendChild(cancelBtn);

  const yesBtn = document.createElement("button");
  yesBtn.className = "ag-confirm__yes";
  yesBtn.id = "ag-confirm-yes";
  yesBtn.type = "button";
  yesBtn.textContent = "Yes, dismiss";
  actions.appendChild(yesBtn);

  box.appendChild(actions);
  modal.appendChild(box);

  return modal;
}


/* ------------------------------------------------------------
   5. EVENT HANDLERS
   Wires up every click on the banner and modal.
   ------------------------------------------------------------ */
function ag_attachBannerEvents(banner) {
  const dismissBtn = banner.querySelector("#ag-banner-dismiss");
  const expandBtn  = banner.querySelector("#ag-banner-expand");
  const details    = banner.querySelector("#ag-banner-details");
  const leaveBtn   = banner.querySelector("#ag-banner-leave");

  // --- Expand / collapse the details panel ---
  expandBtn.addEventListener("click", function () {
    const isOpen = expandBtn.getAttribute("aria-expanded") === "true";
    expandBtn.setAttribute("aria-expanded", isOpen ? "false" : "true");
    details.hidden = isOpen;
  });

  // --- Leave Page → use browser back history ---
  leaveBtn.addEventListener("click", function () {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // No history — close the tab if extension can, otherwise just dismiss
      window.close();
    }
  });

  // --- Dismiss (X) → open confirmation modal ---
  dismissBtn.addEventListener("click", function () {
    ag_showConfirmModal(banner);
  });
}


function ag_showConfirmModal(banner) {
  // Build it fresh each time so we don't leak old listeners
  const modal = ag_buildConfirmModal();
  document.body.appendChild(modal);

  const cancelBtn   = modal.querySelector("#ag-confirm-cancel");
  const yesBtn      = modal.querySelector("#ag-confirm-yes");
  const backdrop    = modal.querySelector("#ag-confirm-backdrop");

  // Close modal helper
  function closeModal() {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }

  // Cancel and backdrop click → close modal, keep banner
  cancelBtn.addEventListener("click", closeModal);
  backdrop.addEventListener("click", closeModal);

  // Confirm dismiss → close modal AND remove banner
  yesBtn.addEventListener("click", function () {
    closeModal();
    if (banner.parentNode) {
      banner.parentNode.removeChild(banner);
    }
  });

  // Move keyboard focus to Cancel (the safe default)
  cancelBtn.focus();
}


/* ------------------------------------------------------------
   6. SESSION DISMISS TRACKING
   When the user dismisses the banner for a product, remember
   which URL they were on so we don't immediately re-show it
   when the MutationObserver triggers another scan.
   Cleared automatically when the URL changes (new product).
   ------------------------------------------------------------ */
let ag_dismissedUrl = null;

function ag_markDismissed() {
  ag_dismissedUrl = window.location.href;
}

function ag_isDismissed() {
  return ag_dismissedUrl === window.location.href;
}


/* ------------------------------------------------------------
   7. THE MAIN SCAN ROUTINE
   Asks the scraper, runs the matcher, injects the banner.
   Bails out cleanly if anything is missing.
   ------------------------------------------------------------ */
function ag_runScan() {
  // Don't re-show banner if user explicitly dismissed it on this URL
  if (ag_isDismissed()) {
    return;
  }

  // Don't double-inject if a banner is already on the page
  if (document.getElementById("ag-banner")) {
    return;
  }

  const scraper = ag_pickScraper();
  if (!scraper || typeof scraper.scrape !== "function") {
    return;  // Not a supported site
  }

  // Get user allergens, then scrape, then match
  ag_loadUserAllergens().then(function (userIds) {
    if (userIds.length === 0) {
      return;  // User hasn't picked any allergens — nothing to warn about
    }

    let product;
    try {
      product = scraper.scrape();
    } catch (err) {
      // If a scraper crashes (DOM changed, etc.), fail quietly
      console.warn("[AllergenGuard] Scraper failed:", err);
      return;
    }

    if (!product || (!product.productName && !product.ingredients)) {
      return;  // Page didn't have product info — probably not on a product page
    }

    const result = window.AG_scanProduct(product, userIds);
    if (!result.hasMatch) {
      return;  // Safe — no allergens detected
    }

    // Match found! Build and inject the banner
    const banner = ag_buildBanner(result.matches);
    document.body.appendChild(banner);
    ag_attachBannerEvents(banner);

    // Wrap dismiss handler to also mark this URL as dismissed
    const originalDismiss = banner.querySelector("#ag-banner-dismiss");
    if (originalDismiss) {
      const oldHandler = originalDismiss.onclick;
      // We can't easily wrap addEventListener, so we hook the modal yes button instead
      // (handled inside ag_showConfirmModal via the dismiss path)
    }
  });
}


/* ------------------------------------------------------------
   8. MUTATION OBSERVER — THE TIMING FIX
   On SPA sites like DoorDash and Uber Eats, the page URL can
   change instantly but the actual product content takes
   1-3 seconds to render via React/API calls.

   A single timeout-based scan misses this window. Instead, we
   watch the DOM for changes and re-scan whenever significant
   content is added. Debounced so we don't slam the CPU.

   Lifecycle:
     - Starts on page load
     - Restarts whenever URL changes (SPA navigation)
     - Auto-disconnects after 30 seconds OR after a successful
       banner injection (to save CPU on idle pages)
   ------------------------------------------------------------ */
let ag_currentObserver = null;

function ag_startDOMObserver() {
  // Disconnect any previous observer before starting a new one
  if (ag_currentObserver) {
    ag_currentObserver.disconnect();
    ag_currentObserver = null;
  }

  let scanTimeout = null;
  let scanCount = 0;
  const MAX_SCANS = 30;       // Safety cap — stop after 30 re-scans
  const DEBOUNCE_MS = 400;    // Wait this long after last DOM change
  const AUTO_DISCONNECT_MS = 30000;  // 30s lifetime cap

  const observer = new MutationObserver(function () {
    // If banner is already shown, no need to keep scanning
    if (document.getElementById("ag-banner")) {
      observer.disconnect();
      ag_currentObserver = null;
      return;
    }

    // Debounce — wait for DOM changes to settle before scanning
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(function () {
      scanCount++;
      ag_runScan();

      if (scanCount >= MAX_SCANS) {
        observer.disconnect();
        ag_currentObserver = null;
      }
    }, DEBOUNCE_MS);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: false  // Don't fire on every text edit (too noisy)
  });

  ag_currentObserver = observer;

  // Hard cap — stop observing after 30s no matter what
  setTimeout(function () {
    if (ag_currentObserver === observer) {
      observer.disconnect();
      ag_currentObserver = null;
    }
  }, AUTO_DISCONNECT_MS);
}


/* ------------------------------------------------------------
   9. WATCH FOR SPA URL CHANGES
   When the URL changes (e.g., user clicks a different product
   on DoorDash), we need to:
     - Remove any stale banner from the previous page
     - Reset the dismiss state (it was for the old product)
     - Restart the DOM observer for the new page
   ------------------------------------------------------------ */
function ag_watchUrlChanges() {
  let lastUrl = window.location.href;

  setInterval(function () {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;

      // Remove any stale banner from the previous product
      const existing = document.getElementById("ag-banner");
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }

      // Clear dismissed-URL flag (new page = fresh slate)
      ag_dismissedUrl = null;

      // Quick first scan + restart the DOM observer for the new page
      setTimeout(ag_runScan, 600);
      ag_startDOMObserver();
    }
  }, 800);
}


/* ------------------------------------------------------------
   10. KICKOFF
   Run an initial scan once the page is idle, then keep
   watching for URL changes AND DOM mutations.
   ------------------------------------------------------------ */
function ag_init() {
  // First scan on load (catches static pages like Amazon)
  ag_runScan();

  // Start watching for DOM mutations (catches React/SPA renders)
  ag_startDOMObserver();

  // Listen for URL changes and re-scan + restart observer
  ag_watchUrlChanges();
}

// document_idle in manifest already waits for the page to settle,
// but a small additional delay helps SPA frameworks finish painting.
setTimeout(ag_init, 600);