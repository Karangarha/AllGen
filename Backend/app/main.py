from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from database import scan_ingredients

app = FastAPI(title="AllGen API")

# ============================================================
# CORS Middleware — Allows the Chrome extension to call this API
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Allow any origin (fine for hackathon dev)
    allow_credentials=False,
    allow_methods=["*"],          # Allow POST, GET, OPTIONS, etc.
    allow_headers=["*"],          # Allow Content-Type, etc.
)


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