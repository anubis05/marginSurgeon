"""POST /api/social-card — Generate PNG social card."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Request
from fastapi.responses import Response, JSONResponse

from backend.agents.margin_analyzer import generate_social_card

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/social-card")
async def social_card(request: Request):
    try:
        body = await request.json()
        business_name = body.get("businessName", "")
        total_leakage = body.get("totalLeakage", 0)
        top_item = body.get("topItem", "Optimization")

        if not business_name:
            return JSONResponse({"error": "Missing data"}, status_code=400)

        image_bytes = await generate_social_card(business_name, total_leakage, top_item)

        return Response(
            content=image_bytes,
            media_type="image/png",
            headers={"Content-Disposition": 'attachment; filename="MenuSurgeon-Report.png"'},
        )

    except Exception as e:
        logger.error(f"Social Card Generation Failed: {e}")
        return JSONResponse({"error": "Generation Failed"}, status_code=500)
