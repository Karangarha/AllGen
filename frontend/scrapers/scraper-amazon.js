/* ============================================================
   AllergenGuard — Amazon Scraper
   Reads product name (and any visible ingredient text)
   from Amazon product pages.

   Why Amazon is tricky:
     - Ingredients are often embedded in images (we can't read those)
     - When ingredients ARE in text, they live in different
       sections per product type
     - The product title is usually packed with allergen info
       (e.g. "Skippy Peanut Butter, Creamy, 16.3oz")

   Strategy:
     - Get the product title reliably (your original selector)
     - Look in a few common spots for ingredient text
     - If nothing is found, return empty — the matcher will
       still scan the title for allergen words

   How it's used:
     - Runs only on amazon.com pages (set in manifest)
     - Registers itself onto window.AG_scrapers.amazon
     - alert-banner.js calls scrape() to get the product info
   ============================================================ */


/* ------------------------------------------------------------
   1. SAFE QUERY HELPER
   Same defensive wrapper as the other scrapers.
   ------------------------------------------------------------ */
function ag_az_safeQuery(selector) {
  try {
    return document.querySelector(selector);
  } catch (err) {
    return null;
  }
}


/* ------------------------------------------------------------
   2. SAFE QUERY-ALL HELPER
   Same idea but returns a NodeList (or empty array on error).
   We need this for ingredients because Amazon sometimes
   spreads info across multiple elements.
   ------------------------------------------------------------ */
function ag_az_safeQueryAll(selector) {
  try {
    const found = document.querySelectorAll(selector);
    return found ? found : [];
  } catch (err) {
    return [];
  }
}


/* ------------------------------------------------------------
   3. EXTRACT PRODUCT NAME
   Amazon puts the title in span#productTitle. Almost every
   product page on Amazon uses this, so it's very reliable.
   Falls back to <b> tag (matches your original query).
   ------------------------------------------------------------ */
function ag_az_getProductName() {
  const primary = ag_az_safeQuery('span[id="productTitle"]');
  if (primary && primary.innerText) {
    return primary.innerText.trim();
  }

  const fallback = ag_az_safeQuery("b");
  if (fallback && fallback.innerText) {
    return fallback.innerText.trim();
  }

  return "";
}


/* ------------------------------------------------------------
   4. EXTRACT INGREDIENTS
   Amazon doesn't have one canonical "ingredients" element.
   We try several common locations in order of reliability:

     a. The "Ingredients" section (#important-information,
        section labeled "Ingredients")
     b. The bullet point list (#feature-bullets)
     c. The product description (#productDescription)

   We collect text from any that exist and join them.
   ------------------------------------------------------------ */
function ag_az_getIngredients() {
  const collected = [];

  // 4a. Try the "Important Information" → Ingredients section
  // Amazon labels this section with a heading; we grab the
  // whole "important-information" container if it exists.
  const importantInfo = ag_az_safeQuery("#important-information");
  if (importantInfo && importantInfo.innerText) {
    collected.push(importantInfo.innerText.trim());
  }

  // 4b. Try the bullet feature list (very common on grocery items)
  const featureBullets = ag_az_safeQuery("#feature-bullets");
  if (featureBullets && featureBullets.innerText) {
    collected.push(featureBullets.innerText.trim());
  }

  // 4c. Try the product description block
  const description = ag_az_safeQuery("#productDescription");
  if (description && description.innerText) {
    collected.push(description.innerText.trim());
  }

  // If we got anything, join with newlines so the matcher
  // can scan all of it as a single text blob
  if (collected.length > 0) {
    return collected.join("\n");
  }

  // Final fallback (matches your original query): <b> tag
  const fallback = ag_az_safeQuery("b");
  if (fallback && fallback.innerText) {
    return fallback.innerText.trim();
  }

  return "";
}


/* ------------------------------------------------------------
   5. MAIN SCRAPE FUNCTION
   Returns the standard { productName, ingredients } object.
   ------------------------------------------------------------ */
function ag_az_scrape() {
  return {
    productName: ag_az_getProductName(),
    ingredients: ag_az_getIngredients()
  };
}


/* ------------------------------------------------------------
   6. REGISTER WITH GLOBAL SCRAPER REGISTRY
   ------------------------------------------------------------ */
if (!window.AG_scrapers) {
  window.AG_scrapers = {};
}

window.AG_scrapers.amazon = {
  name: "Amazon",
  scrape: ag_az_scrape
};