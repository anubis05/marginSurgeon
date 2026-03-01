"""
Margin analyzer agents — 5 LlmAgents + SequentialAgent orchestrator.

Pipeline: VisionIntake → Benchmarker → CommodityWatchdog → Surgeon → Advisor
"""

from google.adk.agents import LlmAgent, SequentialAgent

from backend.config import AgentModels
from backend.agents.margin_analyzer.prompts import (
    VISION_INTAKE_INSTRUCTION,
    BENCHMARKER_INSTRUCTION,
    COMMODITY_WATCHDOG_INSTRUCTION,
    SURGEON_INSTRUCTION,
    ADVISOR_INSTRUCTION,
)
from backend.agents.margin_analyzer.tools import (
    benchmark_tool,
    commodity_inflation_tool,
    surgery_tool,
)


# ---------------------------------------------------------------------------
# Individual agents
# ---------------------------------------------------------------------------

vision_intake_agent = LlmAgent(
    name="VisionIntakeAgent",
    model=AgentModels.DEFAULT_FAST_MODEL,
    instruction=VISION_INTAKE_INSTRUCTION,
    output_key="parsedMenuItems",
)

benchmarker_agent = LlmAgent(
    name="BenchmarkerAgent",
    model=AgentModels.DEFAULT_FAST_MODEL,
    instruction=BENCHMARKER_INSTRUCTION,
    tools=[benchmark_tool],
    output_key="competitorBenchmarks",
)

commodity_watchdog_agent = LlmAgent(
    name="CommodityWatchdogAgent",
    model=AgentModels.DEFAULT_FAST_MODEL,
    instruction=COMMODITY_WATCHDOG_INSTRUCTION,
    tools=[commodity_inflation_tool],
    output_key="commodityTrends",
)

surgeon_agent = LlmAgent(
    name="SurgeonAgent",
    model=AgentModels.DEFAULT_FAST_MODEL,
    instruction=SURGEON_INSTRUCTION,
    tools=[surgery_tool],
    output_key="menuAnalysis",
)

advisor_agent = LlmAgent(
    name="AdvisorAgent",
    model=AgentModels.DEFAULT_FAST_MODEL,
    instruction=ADVISOR_INSTRUCTION,
    output_key="strategicAdvice",
)


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

margin_surgery_orchestrator = SequentialAgent(
    name="MarginSurgeryOrchestrator",
    description="Executes the full margin surgeon pipeline sequentially, taking the output of each agent and passing it to the next.",
    sub_agents=[
        vision_intake_agent,
        benchmarker_agent,
        commodity_watchdog_agent,
        surgeon_agent,
        advisor_agent,
    ],
)
