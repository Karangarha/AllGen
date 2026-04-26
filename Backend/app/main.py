from fastapi import FastAPI, Body
from database import scan_ingredients

app = FastAPI(title="AllGen API")

@app.post("/check-ingredients")
async def check_ingredients_list(payload: dict = Body(...)):
    """
    Accepts a raw ingredients string and returns flagged allergens.
    Input JSON: {"ingredients": "Enriched flour, whey, soy lecithin..."}
    """
    ingredients = payload.get("ingredients", "")
    
    if not ingredients:
        return {"status": "empty", "flagged_allergens": {}}

    conflicts = scan_ingredients(ingredients)
    
    return {
        "status": "danger" if conflicts else "safe",
        "flagged_allergens": conflicts,
        "count": len(conflicts)
    }