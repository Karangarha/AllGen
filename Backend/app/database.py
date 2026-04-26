import re
from allergen_data import BIG_9_ALIASES

def scan_ingredients(raw_text: str):
    """
    Scans a raw ingredient string for hidden allergen names.
    Returns a dictionary of found allergens and the specific words that triggered them.
    """
    found_conflicts = {}
    
    # Normalize text: lowercase and remove punctuation
    clean_text = raw_text.lower()
    
    for allergen, aliases in BIG_9_ALIASES.items():
        # Create a regex pattern that matches any of the aliases as whole words
        # This prevents 'pea' from matching 'pear'
        pattern = r'\b(' + '|'.join(re.escape(alias) for alias in aliases) + r')\b'
        
        matches = re.findall(pattern, clean_text)
        if matches:
            # Store the unique triggers found (e.g., {"milk": ["whey", "casein"]})
            found_conflicts[allergen] = list(set(matches))
            
    return found_conflicts