/* ============================================================
   AllergenGuard — Allergen Matcher
   The "detective" that compares scraped ingredient text
   against the user's selected allergens.

   Inputs:
     - ingredientText: raw string scraped from the page
     - userAllergenIds: array of allergen IDs the user cares
                        about, e.g. ["milk", "peanuts"]

   Output:
     - { hasMatch: boolean, matches: [...] }
       Each match has the allergen and the alias that triggered.

   Used by: alert-banner.js
   Depends on: allergen-data.js (must load BEFORE this file)
   ============================================================ */


/* ------------------------------------------------------------
   1. NORMALIZE TEXT
   Cleans up scraped text so we can match it reliably.

   Real-world ingredient strings are messy:
     "Contains: WHEY (Milk), Soy Lecithin*, Peanut Oil."
   We need to flatten this to:
     "contains: whey (milk), soy lecithin*, peanut oil."

   so our lowercase aliases can find a match.
   ------------------------------------------------------------ */
function ag_normalize(text) {
  if (!text || typeof text !== "string") {
    return "";
  }
  return text
    .toLowerCase()                  // case-insensitive matching
    .replace(/\s+/g, " ")           // collapse multiple spaces
    .trim();                        // remove leading/trailing space
}


/* ------------------------------------------------------------
   2. WORD-BOUNDARY ALIAS CHECK
   The naive way is `text.includes("milk")` — but that ALSO
   matches "buttermilk" (correct) AND "milkweed" (wrong).

   We use a regex with word boundaries (\b) so an alias only
   matches when surrounded by non-letter characters:
     - "milk, soy" → matches "milk" ✓
     - "buttermilk" → matches "buttermilk" only if it's an alias ✓
     - "milkweed" → does NOT match "milk" ✓

   Special chars in aliases (parentheses, apostrophes) are
   escaped so they don't break the regex.
   ------------------------------------------------------------ */
function ag_aliasMatches(normalizedText, alias) {
  // Escape regex-special characters in the alias
  const safeAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Build a word-boundary regex around the alias
  const pattern = new RegExp("\\b" + safeAlias + "\\b", "i");

  return pattern.test(normalizedText);
}


/* ------------------------------------------------------------
   3. THE MAIN MATCHER
   Loops through every allergen the user cares about, then
   loops through that allergen's aliases. Returns a list of
   matches so the banner can tell the user exactly what
   triggered the warning.

   Stops checking aliases for an allergen as soon as one hits
   (we only need to know IT contains milk, not WHICH 5 milk
   words appeared).
   ------------------------------------------------------------ */
function ag_findMatches(ingredientText, userAllergenIds) {
  // Defensive defaults — handle missing inputs gracefully
  const text = ag_normalize(ingredientText);
  const userIds = Array.isArray(userAllergenIds) ? userAllergenIds : [];

  // Nothing to scan or no allergens selected → no matches
  if (text === "" || userIds.length === 0) {
    return { hasMatch: false, matches: [] };
  }

  const allAllergens = window.AG_ALLERGENS || [];
  const matches = [];

  // Walk through each allergen the user has flagged
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];

    // Find the full allergen record from the notebook
    const allergen = allAllergens.find(function (a) {
      return a.id === userId;
    });
    if (!allergen) continue;  // unknown id — skip

    // Try each alias until one matches
    for (let j = 0; j < allergen.aliases.length; j++) {
      const alias = allergen.aliases[j];

      if (ag_aliasMatches(text, alias)) {
        matches.push({
          allergenId: allergen.id,
          allergenLabel: allergen.label,
          allergenEmoji: allergen.emoji,
          matchedAlias: alias
        });
        break;  // one hit per allergen is enough
      }
    }
  }

  return {
    hasMatch: matches.length > 0,
    matches: matches
  };
}


/* ------------------------------------------------------------
   4. CONVENIENCE WRAPPER — match against a full product
   Some scrapers return both a name and an ingredient list.
   This combines them into one search blob so we catch
   allergens hiding in either field.
   Example: a DoorDash item may say "Peanut Butter Cookie"
   in the title with no ingredients listed at all.
   ------------------------------------------------------------ */
function ag_scanProduct(product, userAllergenIds) {
  const safe = product || {};
  const blob = (safe.productName || "") + " " + (safe.ingredients || "");
  return ag_findMatches(blob, userAllergenIds);
}


/* ------------------------------------------------------------
   5. EXPORT TO WINDOW
   Same approach as allergen-data.js — attach to window so
   other files can call it without imports.
   ------------------------------------------------------------ */
window.AG_findMatches = ag_findMatches;
window.AG_scanProduct = ag_scanProduct;