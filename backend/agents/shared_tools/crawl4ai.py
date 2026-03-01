"""
Crawl4aiTool — calls crawl4ai Docker REST API for markdown extraction.

Gracefully degrades: returns `{ error }` if crawl4ai service is down.
Content is truncated to 10K chars to avoid session state bloat.
Port of src/agents/tools/crawl4aiTool.ts.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

CRAWL4AI_URL = os.environ.get("CRAWL4AI_URL", "http://localhost:11235")
MAX_CONTENT_LENGTH = 10_000


async def crawl_for_content(
    url: str,
    extraction_query: Optional[str] = None,
) -> dict[str, Any]:
    """
    Use crawl4ai to extract clean markdown content, links, and media from a web page.
    Returns structured markdown suitable for LLM analysis.
    Gracefully returns an error if the crawl4ai service is unavailable.

    Args:
        url: The full URL to crawl (e.g. https://example.com).
        extraction_query: Optional specific content to focus on extracting.

    Returns:
        dict with 'markdown', 'links', 'media' keys, or 'error' on failure.
    """
    try:
        logger.info(f"[Crawl4aiTool] Crawling {url} via crawl4ai...")

        body: dict[str, Any] = {
            "urls": [url],
            "priority": 5,
        }

        if extraction_query:
            body["extraction_config"] = {
                "type": "llm",
                "params": {"instruction": extraction_query},
            }

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"{CRAWL4AI_URL}/crawl",
                json=body,
            )

        if res.status_code != 200:
            text = res.text[:200]
            logger.warning(f"[Crawl4aiTool] crawl4ai returned {res.status_code}: {text}")
            return {"error": f"crawl4ai returned HTTP {res.status_code}"}

        data = res.json()
        result = data[0] if isinstance(data, list) else data

        markdown = (
            result.get("markdown") or result.get("result", {}).get("markdown") or ""
        )[:MAX_CONTENT_LENGTH]

        links = (
            result.get("links") or result.get("result", {}).get("links") or []
        )[:100]

        media = (
            result.get("media") or result.get("result", {}).get("media") or []
        )[:50]

        logger.info(
            f"[Crawl4aiTool] Extracted {len(markdown)} chars markdown, {len(links)} links, {len(media)} media"
        )

        return {"markdown": markdown, "links": links, "media": media}

    except httpx.TimeoutException:
        logger.warning("[Crawl4aiTool] Request timed out after 30s")
        return {"error": "crawl4ai request timed out"}
    except Exception as error:
        logger.warning(f"[Crawl4aiTool] Service unavailable: {error}")
        return {"error": f"crawl4ai unavailable: {error}"}
