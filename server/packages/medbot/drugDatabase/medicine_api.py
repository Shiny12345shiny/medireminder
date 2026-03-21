"""
Medicine Database API - FastAPI Application
============================================
A comprehensive REST API for querying medicine information,
checking drug interactions, and validating contraindications.

Version: 1.0.0
"""

import json
import os
import re
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

import sys
sys.stdout.reconfigure(encoding='utf-8')
# ─────────────────────────────────────────────
# App Initialization
# ─────────────────────────────────────────────

app = FastAPI(
    title="Medicine Database API",
    description=(
        "A comprehensive API for querying medicine information, "
        "checking drug-drug interactions, and validating contraindications "
        "for a medical reminder application."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─────────────────────────────────────────────
# CORS Middleware
# ─────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Load Medicine Database
# ─────────────────────────────────────────────

DB_PATH = os.path.join(os.path.dirname(__file__), "medicines.json")

def load_medicine_database() -> List[Dict[str, Any]]:
    try:
        with open(DB_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        medicines = data.get("medicines", [])
        print(f"✅ Loaded {len(medicines)} medicines from database.")
        return medicines
    except FileNotFoundError:
        print(f"❌ ERROR: medicines.json not found at {DB_PATH}")
        return []
    except json.JSONDecodeError as e:
        print(f"❌ ERROR: Failed to parse medicines.json: {e}")
        return []

MEDICINES: List[Dict[str, Any]] = load_medicine_database()

# ─────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────

class InteractionRequest(BaseModel):
    medicines: List[str] = Field(
        ...,
        min_length=2,
        description="List of at least 2 medicine names",
        example=["Metformin", "Ciprofloxacin"],
    )

class ContraindicationRequest(BaseModel):
    medicine: str = Field(..., example="Metformin")
    conditions: List[str] = Field(
        ...,
        example=["Chronic Kidney Disease", "Liver Disease"],
    )

class ErrorResponse(BaseModel):
    error: str
    detail: str
    statusCode: int

# ─────────────────────────────────────────────
# Helper Utilities
# ─────────────────────────────────────────────

def normalize(text: str) -> str:
    return text.strip().lower()

def find_medicine_by_name(name: str) -> Optional[Dict[str, Any]]:
    name_lower = normalize(name)
    for med in MEDICINES:
        if normalize(med.get("medicineName", "")) == name_lower:
            return med
        if normalize(med.get("genericName", "")) == name_lower:
            return med
        for brand in med.get("brandNames", []):
            if normalize(brand) == name_lower:
                return med
    return None

def search_medicines_by_query(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    query_lower = normalize(query)
    scored = []
    for med in MEDICINES:
        score = 0
        name = normalize(med.get("medicineName", ""))
        generic = normalize(med.get("genericName", ""))
        brands = [normalize(b) for b in med.get("brandNames", [])]
        category = normalize(med.get("category", ""))
        uses = [normalize(u) for u in med.get("uses", [])]

        if name == query_lower or generic == query_lower:
            score = 100
        elif name.startswith(query_lower) or generic.startswith(query_lower):
            score = 80
        elif query_lower in name or query_lower in generic:
            score = 60
        elif any(b == query_lower or b.startswith(query_lower) for b in brands):
            score = 70
        elif any(query_lower in b for b in brands):
            score = 50
        elif query_lower in category:
            score = 40
        elif any(query_lower in u for u in uses):
            score = 30

        if score > 0:
            scored.append((score, med))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [med for _, med in scored[:limit]]

def check_interactions_between(medicines: List[Dict]) -> List[Dict]:
    interactions_found = []
    for i in range(len(medicines)):
        for j in range(i + 1, len(medicines)):
            med_a = medicines[i]
            med_b = medicines[j]
            name_b = normalize(med_b.get("medicineName", ""))
            brands_b = [normalize(b) for b in med_b.get("brandNames", [])]

            for interaction in med_a.get("interactions", {}).get("drugInteractions", []):
                interacting_drug = normalize(interaction.get("drug", ""))
                if interacting_drug == name_b or interacting_drug in brands_b:
                    interactions_found.append({
                        "drug1": med_a.get("medicineName"),
                        "drug2": med_b.get("medicineName"),
                        "severity": interaction.get("severity", "Unknown"),
                        "effect": interaction.get("effect", ""),
                        "recommendation": interaction.get("recommendation", ""),
                    })
    return interactions_found

def check_contraindications_for_conditions(
    medicine: Dict, conditions: List[str]
) -> List[Dict]:
    matches = []
    contraindications = medicine.get("contraindications", [])
    for condition in conditions:
        condition_lower = normalize(condition)
        for contra in contraindications:
            if condition_lower in normalize(contra) or normalize(contra) in condition_lower:
                matches.append({
                    "condition": condition,
                    "contraindicationFound": contra,
                    "severity": "Contraindicated",
                })
    return matches

# ─────────────────────────────────────────────
# 1. GET /health
# ─────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    return JSONResponse(
        content={
            "success": True,
            "status": "healthy",
            "medicinesLoaded": len(MEDICINES),
            "version": "1.0.0",
        }
    )

# ─────────────────────────────────────────────
# 2. GET /api/medicine/{name}
# ─────────────────────────────────────────────

@app.get("/api/medicine/{name}", tags=["Medicines"])
async def get_medicine(
    name: str = Path(..., description="Medicine name", example="Metformin")
):
    medicine = find_medicine_by_name(name)
    if not medicine:
        raise HTTPException(
            status_code=404,
            detail=f"Medicine '{name}' not found in the database.",
        )
    return JSONResponse(
        content={"success": True, "data": medicine},
        status_code=200,
    )

# ─────────────────────────────────────────────
# 3. GET /api/search
# ─────────────────────────────────────────────

@app.get("/api/search", tags=["Medicines"])
async def search_medicines(
    query: str = Query(..., description="Search term"),
    limit: int = Query(10, ge=1, le=50),
):
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    results = search_medicines_by_query(query.strip(), limit)
    summaries = [
        {
            "medicineName": m.get("medicineName"),
            "genericName": m.get("genericName"),
            "category": m.get("category"),
            "class": m.get("class"),
            "uses": m.get("uses", []),
            "brandNames": m.get("brandNames", []),
        }
        for m in results
    ]
    return JSONResponse(
        content={
            "success": True,
            "query": query,
            "totalFound": len(summaries),
            "returned": len(summaries),
            "results": summaries,
        }
    )

# ─────────────────────────────────────────────
# 4. POST /api/check-interaction
# ─────────────────────────────────────────────

@app.post("/api/check-interaction", tags=["Safety Checks"])
async def check_interaction(body: InteractionRequest):
    if len(body.medicines) < 2:
        raise HTTPException(
            status_code=400, detail="At least 2 medicines are required."
        )

    resolved = []
    not_found = []
    for name in body.medicines:
        med = find_medicine_by_name(name)
        if med:
            resolved.append(med)
        else:
            not_found.append(name)

    interactions = check_interactions_between(resolved)
    major = [i for i in interactions if "major" in i.get("severity", "").lower()]

    warnings = []
    if major:
        warnings.append(
            f"⚠️  {len(major)} MAJOR interaction(s) found. Consult a healthcare provider."
        )

    return JSONResponse(
        content={
            "success": True,
            "checkedMedicines": body.medicines,
            "resolvedMedicines": [m.get("medicineName") for m in resolved],
            "notFoundMedicines": not_found,
            "totalInteractionsFound": len(interactions),
            "hasMajorInteractions": len(major) > 0,
            "interactions": interactions,
            "warnings": warnings,
        }
    )

# ─────────────────────────────────────────────
# 5. GET /api/category/{category}
# ─────────────────────────────────────────────

@app.get("/api/category/{category}", tags=["Medicines"])
async def get_by_category(
    category: str = Path(..., description="Category name", example="Antidiabetic")
):
    category_lower = normalize(category)
    results = [
        m for m in MEDICINES
        if category_lower in normalize(m.get("category", ""))
    ]
    if not results:
        raise HTTPException(
            status_code=404,
            detail=f"No medicines found in category '{category}'.",
        )
    summaries = [
        {
            "medicineName": m.get("medicineName"),
            "genericName": m.get("genericName"),
            "category": m.get("category"),
            "class": m.get("class"),
            "uses": m.get("uses", []),
            "brandNames": m.get("brandNames", []),
        }
        for m in results
    ]
    return JSONResponse(
        content={
            "success": True,
            "category": category,
            "totalFound": len(summaries),
            "medicines": summaries,
        }
    )

# ─────────────────────────────────────────────
# 6. GET /api/medicines (paginated)
# ─────────────────────────────────────────────

@app.get("/api/medicines", tags=["Medicines"])
async def get_all_medicines(
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=50),
):
    total = len(MEDICINES)
    total_pages = (total + pageSize - 1) // pageSize
    start = (page - 1) * pageSize
    end = start + pageSize
    page_medicines = MEDICINES[start:end]

    summaries = [
        {
            "medicineName": m.get("medicineName"),
            "genericName": m.get("genericName"),
            "category": m.get("category"),
            "class": m.get("class"),
            "uses": m.get("uses", []),
            "brandNames": m.get("brandNames", []),
        }
        for m in page_medicines
    ]

    return JSONResponse(
        content={
            "success": True,
            "data": {
                "total": total,
                "page": page,
                "pageSize": pageSize,
                "totalPages": total_pages,
                "hasNextPage": page < total_pages,
                "hasPreviousPage": page > 1,
                "medicines": summaries,
            },
        }
    )

# ─────────────────────────────────────────────
# 7. POST /api/check-contraindications
# ─────────────────────────────────────────────

@app.post("/api/check-contraindications", tags=["Safety Checks"])
async def check_contraindications(body: ContraindicationRequest):
    if not body.medicine.strip():
        raise HTTPException(status_code=400, detail="Medicine name cannot be empty.")
    if not body.conditions:
        raise HTTPException(status_code=400, detail="At least one condition must be provided.")

    medicine = find_medicine_by_name(body.medicine)
    if not medicine:
        raise HTTPException(
            status_code=404,
            detail=f"Medicine '{body.medicine}' not found.",
        )

    matches = check_contraindications_for_conditions(medicine, body.conditions)

    general_warnings = []
    med_warnings = medicine.get("warnings", {})
    if med_warnings.get("pregnancy"):
        general_warnings.append(f"Pregnancy: {med_warnings['pregnancy']}")
    if med_warnings.get("breastfeeding"):
        general_warnings.append(f"Breastfeeding: {med_warnings['breastfeeding']}")
    if med_warnings.get("elderly"):
        general_warnings.append(f"Elderly patients: {med_warnings['elderly']}")
    if med_warnings.get("kidneyDisease"):
        general_warnings.append(f"Kidney Disease: {med_warnings['kidneyDisease']}")

    hard_contras = [m for m in matches if m["severity"] == "Contraindicated"]
    safe_to_use = len(hard_contras) == 0

    return JSONResponse(
        content={
            "success": True,
            "medicine": medicine.get("medicineName"),
            "genericName": medicine.get("genericName"),
            "checkedConditions": body.conditions,
            "contraindicationsFound": matches,
            "totalContraindicationsFound": len(matches),
            "hardContraindicationsCount": len(hard_contras),
            "safeToUse": safe_to_use,
            "generalWarnings": general_warnings,
            "recommendation": (
                "⛔ This medicine has contraindications with the provided conditions. "
                "Consult a healthcare provider immediately."
                if not safe_to_use else
                "✅ No direct contraindications found. Always consult a healthcare provider."
            ),
        }
    )

# ─────────────────────────────────────────────
# 8. GET /api/categories
# ─────────────────────────────────────────────

@app.get("/api/categories", tags=["Medicines"])
async def get_categories():
    categories = sorted(
        set(med.get("category", "") for med in MEDICINES if med.get("category"))
    )
    return JSONResponse(
        content={
            "success": True,
            "totalCategories": len(categories),
            "categories": categories,
        }
    )

# ─────────────────────────────────────────────
# 9. GET /api/medicine/{name}/interactions
# ─────────────────────────────────────────────

@app.get("/api/medicine/{name}/interactions", tags=["Safety Checks"])
async def get_medicine_interactions(
    name: str = Path(..., example="Warfarin")
):
    medicine = find_medicine_by_name(name)
    if not medicine:
        raise HTTPException(status_code=404, detail=f"Medicine '{name}' not found.")

    interactions = medicine.get("interactions", {})
    drug_interactions = interactions.get("drugInteractions", [])
    food_interactions = interactions.get("foodInteractions", [])

    major = [i for i in drug_interactions if "major" in i.get("severity", "").lower()]
    moderate = [i for i in drug_interactions if "moderate" in i.get("severity", "").lower()]
    minor = [i for i in drug_interactions if "minor" in i.get("severity", "").lower()]

    return JSONResponse(
        content={
            "success": True,
            "medicine": medicine.get("medicineName"),
            "genericName": medicine.get("genericName"),
            "totalDrugInteractions": len(drug_interactions),
            "totalFoodInteractions": len(food_interactions),
            "summary": {
                "major": len(major),
                "moderate": len(moderate),
                "minor": len(minor),
            },
            "drugInteractions": {
                "major": major,
                "moderate": moderate,
                "minor": minor,
                "other": [
                    i for i in drug_interactions
                    if i not in major and i not in moderate and i not in minor
                ],
            },
            "foodInteractions": food_interactions,
        }
    )

# ─────────────────────────────────────────────
# 10. GET /api/medicine/{name}/dosage
# ─────────────────────────────────────────────

@app.get("/api/medicine/{name}/dosage", tags=["Medicines"])
async def get_medicine_dosage(
    name: str = Path(..., example="Metformin")
):
    medicine = find_medicine_by_name(name)
    if not medicine:
        raise HTTPException(status_code=404, detail=f"Medicine '{name}' not found.")

    return JSONResponse(
        content={
            "success": True,
            "medicine": medicine.get("medicineName"),
            "genericName": medicine.get("genericName"),
            "dosage": medicine.get("dosage", {}),
            "timing": medicine.get("timing", {}),
            "storage": medicine.get("storage"),
        }
    )

# ─────────────────────────────────────────────
# Global Exception Handlers
# ─────────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "statusCode": exc.status_code,
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc),
            "statusCode": 500,
        },
    )

# ─────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "medicine_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )