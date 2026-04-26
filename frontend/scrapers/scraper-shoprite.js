/* ============================================================
   AllergenGuard — ShopRite Scraper
   Reads product name (and any visible ingredient text)
   from ShopRite product pages.

   How it's used:
     - Runs only on shoprite.com pages (set in manifest)
     - Registers itself onto window.AG_scrapers.shoprite
     - alert-banner.js calls scrape() to get the product info

   Notes:
     - Ingredients are often hidden behind tabs or in images
       on ShopRite product pages
     - The product title usually contains useful allergen
       hints (e.g. "Skippy Peanut Butter Creamy 16.3oz")
     - We attempt several common selectors for ingredient
       text but gracefully return empty if nothing is found

   DOM selector for product name:
     - h2[data-testid="pdpInfoTitle-h2-testId"]
   ============================================================ */


/* ------------------------------------------------------------
   1. SAFE QUERY HELPER
   Same defensive wrapper as the other scrapers.
   ------------------------------------------------------------ */
function ag_sr_safeQuery(selector) {
  try {
    return document.querySelector(selector);
  } catch (err) {
    return null;
  }
}


/* ------------------------------------------------------------
   2. EXTRACT PRODUCT NAME
   ShopRite uses a specific test ID on the product detail
   page (PDP) title. Falls back to <b> tag if that fails
   (matches your original query).
   ------------------------------------------------------------ */
function ag_sr_getProductName() {
  const primary = ag_sr_safeQuery('h2[data-testid="pdpInfoTitle-h2-testId"]');
  if (primary && primary.innerText) {
    return primary.innerText.trim();
  }

  const fallback = ag_sr_safeQuery("b");
  if (fallback && fallback.innerText) {
    return fallback.innerText.trim();
  }

  return "";
}


/* ------------------------------------------------------------
   3. EXTRACT INGREDIENTS
   ShopRite doesn't have a single canonical ingredient element.
   We try a couple of common spots where ingredient text
   might live, and return empty if nothing is found. The
   matcher will still scan the product title for allergens
   so we get reasonable detection from the title alone.
   ------------------------------------------------------------ */
function ag_sr_getIngredients() {
  const collected = [];

  // 3a. Try common ingredient/nutrition containers
  // ShopRite uses several patterns — we try the most likely ones
  const ingredientSection = ag_sr_safeQuery('[data-testid*="ingredient" i]');
  if (ingredientSection && ingredientSection.innerText) {
    collected.push(ingredientSection.innerText.trim());
  }

  const nutritionSection = ag_sr_safeQuery('[data-testid*="nutrition" i]');
  if (nutritionSection && nutritionSection.innerText) {
    collected.push(nutritionSection.innerText.trim());
  }

  // 3b. Try the product description / details area
  const description = ag_sr_safeQuery('[data-testid*="description" i]');
  if (description && description.innerText) {
    collected.push(description.innerText.trim());
  }

  // If we got anything, join with newlines for the matcher
  if (collected.length > 0) {
    return collected.join("\n");
  }

  return "";
}


/* ------------------------------------------------------------
   4. MAIN SCRAPE FUNCTION
   Returns the standard { productName, ingredients } object.
   ------------------------------------------------------------ */
function ag_sr_scrape() {
  return {
    productName: ag_sr_getProductName(),
    ingredients: ag_sr_getIngredients()
  };
}


/* ------------------------------------------------------------
   5. REGISTER WITH GLOBAL SCRAPER REGISTRY
   ------------------------------------------------------------ */
if (!window.AG_scrapers) {
  window.AG_scrapers = {};
}

window.AG_scrapers.shoprite = {
  name: "ShopRite",
  scrape: ag_sr_scrape
};