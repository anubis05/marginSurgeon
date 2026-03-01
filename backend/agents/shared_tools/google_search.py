"""
Shared Gemini-grounded Google Search tool.

Uses Gemini's built-in `googleSearch` grounding to execute real web searches.
Port of src/agents/tools/googleSearchTool.ts.
"""

from __future__ import annotations

import logging
import os

from google import genai
from google.genai import types

from backend.config import AgentModels

logger = logging.getLogger(__name__)


async def google_search(query: str) -> dict:
    """
    Search Google for a query to find factual information, URLs, or real-world entities.
    Uses Gemini's built-in googleSearch grounding.

    Args:
        query: The search query to execute.

    Returns:
        dict with 'result' key containing summarized search results, or 'error' on failure.
    """
    try:
        logger.info(f"[GoogleSearchTool] Executing grounded query: {query}")
        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", ""))
        result = await client.aio.models.generate_content(
            model=AgentModels.DEFAULT_FAST_MODEL,
            contents=f"Execute this search and summarize the top facts and URLs precisely related to: {query}",
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
            ),
        )
        return {"result": result.text}
    except Exception as e:
        logger.error(f"[GoogleSearchTool] Failed: {e}")
        return {"error": "Search failed."}
