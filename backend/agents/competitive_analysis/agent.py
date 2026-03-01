"""
Competitive Analysis agents — CompetitorProfiler + MarketPositioning.
Port of src/agents/competitive-analysis/analyzer.ts.
"""

from google.adk.agents import LlmAgent

from backend.config import AgentModels
from backend.agents.shared_tools import google_search_tool
from backend.agents.competitive_analysis.prompts import (
    COMPETITOR_PROFILER_INSTRUCTION,
    MARKET_POSITIONING_INSTRUCTION,
)

competitor_profiler_agent = LlmAgent(
    name="CompetitorProfilerAgent",
    model=AgentModels.DEFAULT_FAST_MODEL,
    instruction=COMPETITOR_PROFILER_INSTRUCTION,
    tools=[google_search_tool],
)

market_positioning_agent = LlmAgent(
    name="MarketPositioningAgent",
    model=AgentModels.DEEP_ANALYST_MODEL,
    instruction=MARKET_POSITIONING_INSTRUCTION,
)
