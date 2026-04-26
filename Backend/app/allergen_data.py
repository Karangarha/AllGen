# allergen_data.py
BIG_9_ALIASES = {
    "milk": [
        "butter", "buttermilk", "casein", "caseinate", "cheese", "cream", "curds", 
        "custard", "diacetyl", "ghee", "lactose", "lactalbumin", "lactoglobulin", 
        "sour cream", "whey", "yogurt"
    ],
    "eggs": [
        "albumin", "albumen", "globulin", "lecithin", "livetin", "lysozyme", 
        "meringue", "ovalbumin", "ovomucoid", "vitellin", "yolk"
    ],
    "peanuts": [
        "arachis oil", "beer nuts", "ground nuts", "monkey nuts", "goobers", "mandelonas"
    ],
    "tree_nuts": [
        "almond", "cashew", "chestnut", "hazelnut", "filbert", "macadamia", 
        "pecan", "pine nut", "pignoli", "pistachio", "walnut", "marzipan", "praline"
    ],
    "wheat": [
        "bulgur", "couscous", "durum", "farina", "kamut", "seitan", "semolina", 
        "spelt", "triticale", "wheat germ", "wheat gluten"
    ],
    "soy": [
        "edamame", "miso", "natto", "shoyu", "soya", "soybean", "tamari", 
        "tempeh", "tofu", "textured vegetable protein"
    ],
    "fish": [
        "anchovy", "bass", "catfish", "cod", "flounder", "grouper", "haddock", 
        "hake", "halibut", "herring", "mahi mahi", "perch", "pollock", "salmon", 
        "scrod", "sole", "snapper", "tilapia", "trout", "tuna", "surimi", "isinglass"
    ],
    "shellfish": [
        "barnacle", "crab", "crayfish", "krill", "lobster", "prawns", "shrimp"
    ],
    "sesame": [
        "benne", "gingelly", "gomasio", "halvah", "tahini", "sesamum indicum"
    ]
}