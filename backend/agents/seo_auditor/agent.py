"""
SeoAuditorAgent — comprehensive SEO auditor across 5 categories.
Port of src/agents/seo-auditor/seoAuditor.ts.
"""

from google.adk.agents import LlmAgent

from backend.config import AgentModels
from backend.agents.shared_tools import google_search_tool
from backend.agents.seo_auditor.prompt import SEO_AUDITOR_INSTRUCTION
from backend.agents.seo_auditor.tools import pagespeed_tool

seo_auditor_agent = LlmAgent(
    name="seoAuditor",
    description="An elite Technical SEO Auditor capable of analyzing websites using Google Search and PageSpeed Insights.",
    instruction=SEO_AUDITOR_INSTRUCTION,
    model=AgentModels.DEEP_ANALYST_MODEL,
    tools=[google_search_tool, pagespeed_tool],
)
