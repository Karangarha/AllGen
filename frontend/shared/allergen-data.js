/* ============================================================
   AllergenGuard — Allergen Data
   The "notebook" of all 9 allergens, the sneaky nicknames
   they appear under in real-world ingredient labels, AND
   the clinical context that explains why each one matters.

   Used by: allergen-matcher.js, alert-banner.js
   ============================================================ */


/* ------------------------------------------------------------
   1. THE BIG 9 ALLERGEN LIST
   Each entry has:
     - id:            internal name (lowercase, used in code)
     - label:         user-facing name (shown in the UI)
     - emoji:         icon shown in onboarding/settings cards
     - aliases:       every word in an ingredient list that
                      means "this product contains this allergen"
     - clinicalNote:  short medical context shown in the banner
                      dropdown so users understand WHY the
                      allergen matters and what to do if exposed.

   IMPORTANT: aliases are stored in lowercase. The matcher
   lowercases the scraped text before comparing.
   ------------------------------------------------------------ */
const AG_ALLERGENS = [
  {
    id: "milk",
    label: "Milk",
    emoji: "🥛",
    clinicalNote:
      "Milk allergy is the most common food allergy in young children, " +
      "affecting roughly 2-3% of infants. Reactions range from hives and " +
      "stomach pain to anaphylaxis — if exposed and symptoms escalate, " +
      "use epinephrine and call 911.",
    aliases: [
      "milk", "whole milk", "skim milk", "buttermilk", "milk solids",
      "milk powder", "milk fat", "dry milk",
      "cream", "heavy cream", "sour cream",
      "butter", "ghee", "clarified butter",
      "cheese", "cheddar", "mozzarella", "parmesan", "ricotta",
      "yogurt", "yoghurt",
      "whey", "whey protein", "whey powder",
      "casein", "caseinate", "sodium caseinate", "calcium caseinate",
      "lactose", "lactalbumin", "lactoglobulin", "lactulose",
      "custard", "pudding", "kefir",
      "condensed milk", "evaporated milk"
    ]
  },

  {
    id: "eggs",
    label: "Eggs",
    emoji: "🥚",
    clinicalNote:
      "Egg allergy affects about 2% of children and can persist into " +
      "adulthood. Both whites and yolks can trigger reactions, including " +
      "anaphylaxis — if exposed and symptoms escalate, use epinephrine " +
      "and call 911.",
    aliases: [
      "egg", "eggs", "egg white", "egg whites", "egg yolk", "egg yolks",
      "whole egg", "dried egg", "powdered egg", "egg powder",
      "albumin", "albumen", "ovalbumin",
      "globulin", "lysozyme", "lecithin (egg)",
      "mayonnaise", "mayo", "aioli",
      "meringue", "meringue powder",
      "ovomucin", "ovomucoid", "ovovitellin",
      "vitellin", "livetin",
      "eggnog"
    ]
  },

  {
    id: "fish",
    label: "Fish",
    emoji: "🐟",
    clinicalNote:
      "Fish allergy is typically lifelong and one of the most severe — " +
      "even cooking vapors or shared cooking surfaces can trigger reactions. " +
      "If exposed and symptoms escalate, use epinephrine immediately and " +
      "call 911.",
    aliases: [
      "fish", "fish sauce", "fish oil", "fish stock", "fish paste",
      "anchovy", "anchovies",
      "bass", "cod", "flounder", "haddock", "halibut",
      "herring", "mackerel", "perch", "pike", "pollock",
      "salmon", "smoked salmon", "lox",
      "sardine", "sardines",
      "snapper", "sole",
      "swordfish", "tilapia", "trout",
      "tuna", "ahi", "albacore", "bonito",
      "caviar", "roe",
      "surimi", "imitation crab",
      "worcestershire sauce"
    ]
  },

  {
    id: "shellfish",
    label: "Shellfish",
    emoji: "🦐",
    clinicalNote:
      "Shellfish is the most common cause of food-related anaphylaxis " +
      "in adults, and reactions tend to be severe even on first known " +
      "exposure. If exposed and symptoms escalate, use epinephrine " +
      "immediately and call 911.",
    aliases: [
      "shellfish",
      "shrimp", "prawn", "prawns",
      "crab", "crabmeat", "king crab", "snow crab",
      "lobster", "langoustine", "scampi",
      "crawfish", "crayfish",
      "clam", "clams", "cockle",
      "mussel", "mussels",
      "oyster", "oysters",
      "scallop", "scallops",
      "squid", "calamari",
      "octopus",
      "abalone",
      "krill"
    ]
  },

  {
    id: "tree_nuts",
    label: "Tree Nuts",
    emoji: "🌰",
    clinicalNote:
      "Tree nut allergies are usually lifelong and frequently cause " +
      "anaphylaxis — cross-contact with peanuts is also common in " +
      "manufacturing. If exposed and symptoms escalate, use epinephrine " +
      "immediately and call 911.",
    aliases: [
      "tree nut", "tree nuts",
      "almond", "almonds", "almond butter", "almond milk", "almond flour",
      "marzipan", "amaretto", "frangipane",
      "brazil nut", "brazil nuts",
      "cashew", "cashews", "cashew butter",
      "chestnut", "chestnuts",
      "filbert", "filberts",
      "hazelnut", "hazelnuts", "praline", "nutella",
      "macadamia", "macadamia nut", "macadamia nuts",
      "pecan", "pecans",
      "pine nut", "pine nuts", "pignoli",
      "pistachio", "pistachios",
      "walnut", "walnuts", "black walnut",
      "nut butter", "nut paste", "nut oil",
      "nougat", "gianduja"
    ]
  },

  {
    id: "peanuts",
    label: "Peanuts",
    emoji: "🥜",
    clinicalNote:
      "Peanut allergies are among the most severe — roughly 1 in 50 " +
      "reactions cause anaphylaxis, and even trace amounts can trigger " +
      "symptoms within minutes. If exposed, use epinephrine immediately " +
      "and call 911.",
    aliases: [
      "peanut", "peanuts",
      "peanut butter", "peanut oil", "peanut flour",
      "groundnut", "groundnuts", "groundnut oil",
      "arachis", "arachis oil",
      "monkey nuts",
      "beer nuts",
      "goobers"
    ]
  },

  {
    id: "wheat",
    label: "Wheat",
    emoji: "🌾",
    clinicalNote:
      "Wheat allergy is distinct from celiac disease and gluten " +
      "sensitivity — true wheat allergy can trigger anaphylaxis, " +
      "especially when combined with exercise. If exposed and symptoms " +
      "escalate, use epinephrine and call 911.",
    aliases: [
      "wheat", "wheat flour", "whole wheat", "wheat starch",
      "wheat germ", "wheat bran", "wheat protein",
      "flour", "all-purpose flour", "bread flour", "cake flour",
      "enriched flour", "self-rising flour",
      "gluten", "vital wheat gluten", "seitan",
      "semolina", "durum", "durum wheat",
      "spelt", "farro", "kamut", "einkorn",
      "bulgur", "couscous", "freekeh",
      "graham flour",
      "bread crumbs", "breadcrumbs", "panko",
      "pasta", "noodles", "udon", "ramen",
      "matzo", "matzoh", "matzah"
    ]
  },

  {
    id: "soy",
    label: "Soy",
    emoji: "🫘",
    clinicalNote:
      "Soy allergy most often appears in infancy and is found in many " +
      "processed foods — soy lecithin and soy oil are common hidden " +
      "sources. Severe reactions are uncommon but possible — if " +
      "anaphylaxis occurs, use epinephrine and call 911.",
    aliases: [
      "soy", "soya", "soybean", "soybeans", "soy bean",
      "soy sauce", "soya sauce", "tamari", "shoyu",
      "soy protein", "soy protein isolate", "soy flour",
      "soy milk", "soya milk",
      "soy lecithin", "lecithin (soy)",
      "tofu", "tempeh", "edamame", "miso", "natto",
      "textured vegetable protein", "tvp",
      "hydrolyzed soy protein"
    ]
  },

  {
    id: "sesame",
    label: "Sesame",
    emoji: "⚪",
    clinicalNote:
      "Sesame became the 9th federally-recognized major allergen in 2023, " +
      "and reactions are often severe — even tiny amounts in tahini, " +
      "hummus, or bread can trigger anaphylaxis. If exposed, use " +
      "epinephrine immediately and call 911.",
    aliases: [
      "sesame", "sesame seed", "sesame seeds",
      "sesame oil", "toasted sesame oil",
      "sesame paste",
      "tahini",
      "benne", "benne seed", "gingelly", "til",
      "halva", "halvah",
      "everything bagel seasoning"
    ]
  }
];


/* ------------------------------------------------------------
   2. EXPORT FOR CHROME EXTENSION USE
   Chrome content scripts don't use modern import/export.
   Instead we attach the data to the global "window" object
   so other files (matcher, scrapers, banner) can access it.
   ------------------------------------------------------------ */
window.AG_ALLERGENS = AG_ALLERGENS;


/* ------------------------------------------------------------
   3. HELPER — find an allergen by id
   Used by the popup and settings to render the correct
   emoji/label when displaying the user's selections.
   ------------------------------------------------------------ */
window.AG_getAllergenById = function (id) {
  return AG_ALLERGENS.find(function (allergen) {
    return allergen.id === id;
  }) || null;
};


/* ------------------------------------------------------------
   4. HELPER — get the clinical note for an allergen
   Used by the alert banner to display the "Why this matters"
   section. Falls back to empty string if id is unknown.
   ------------------------------------------------------------ */
window.AG_getClinicalNote = function (id) {
  const allergen = window.AG_getAllergenById(id);
  return (allergen && allergen.clinicalNote) || "";
};