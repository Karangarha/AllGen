/* ============================================================
   AllergenGuard — Uber Eats Scraper
   Reads product name and ingredients from Uber Eats pages.

   How it's used:
     - Runs only on ubereats.com pages (set in manifest)
     - Registers itself onto window.AG_scrapers.ubereats
     - alert-banner.js calls scrape() to get the product info
     - The matcher then checks for allergen aliases

   DOM selectors are based on the queries you provided:
     - Product name: h1[data-testid="menu-item-title"]
     - Ingredients:  div[data-testid="item-metadata-ingredients_metadata"]
     - Note: ingredients often contain duplicates that we dedupe
   ============================================================ */


/* ------------------------------------------------------------
   1. SAFE QUERY HELPER
   Same defensive wrapper as the DoorDash scraper.
   Returns null on any error instead of throwing.
   ------------------------------------------------------------ */
function ag_ue_safeQuery(selector) {
  try {
    return document.querySelector(selector);
  } catch (err) {
    return null;
  }
}


/* ------------------------------------------------------------
   2. EXTRACT PRODUCT NAME
   Tries the specific Uber Eats selector first, falls back
   to the first <h1> on the page if that fails.
   ------------------------------------------------------------ */
function ag_ue_getProductName() {
  const primary = ag_ue_safeQuery('h1[data-testid="menu-item-title"]');
  if (primary && primary.innerText) {
    return primary.innerText.trim();
  }

  const fallback = ag_ue_safeQuery("h1");
  if (fallback && fallback.innerText) {
    return fallback.innerText.trim();
  }

  return "";
}


/* ------------------------------------------------------------
   3. EXTRACT INGREDIENTS (with deduplication)
   Uber Eats sometimes lists the same ingredient multiple
   times in the metadata block. We split on newlines, trim
   each piece, drop empties, then de-duplicate before joining.
   ------------------------------------------------------------ */
function ag_ue_getIngredients() {
  const container = ag_ue_safeQuery('div[data-testid="item-metadata-ingredients_metadata"]');

  if (container && container.innerText) {
    const raw = container.innerText;

    // Split by line breaks, trim whitespace, drop empties
    const parts = raw
      .split("\n")
      .map(function (p) { return p.trim(); })
      .filter(function (p) { return p.length > 0; });

    // Deduplicate while preserving order
    const seen = {};
    const unique = [];
    parts.forEach(function (p) {
      const key = p.toLowerCase();
      if (!seen[key]) {
        seen[key] = true;
        unique.push(p);
      }
    });

    return unique.join("\n");
  }

  // Fallback: any <span> with text on the page (very loose)
  const fallback = ag_ue_safeQuery("span");
  if (fallback && fallback.innerText) {
    return fallback.innerText.trim();
  }

  return "";
}


/* ------------------------------------------------------------
   4. MAIN SCRAPE FUNCTION
   Returns the standard { productName, ingredients } object.
   ------------------------------------------------------------ */
function ag_ue_scrape() {
  return {
    productName: ag_ue_getProductName(),
    ingredients: ag_ue_getIngredients()
  };
}


/* ------------------------------------------------------------
   5. REGISTER WITH GLOBAL SCRAPER REGISTRY
   ------------------------------------------------------------ */
if (!window.AG_scrapers) {
  window.AG_scrapers = {};
}

window.AG_scrapers.ubereats = {
  name: "Uber Eats",
  scrape: ag_ue_scrape
};