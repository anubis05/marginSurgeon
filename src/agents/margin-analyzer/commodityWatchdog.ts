import { AgentModels } from "../config";
import { FunctionTool, LlmAgent } from "@google/adk";
import { z } from "zod";
import { CommodityTrend } from '@/lib/types';
import { callMarketTruthTool } from '../mcpClient';
import { ZipCacheReader } from '../weekly-cache/zipCacheReader';

const CheckCommoditiesTool = new FunctionTool({
    name: 'check_commodity_inflation',
    description: 'Provide an array of menu item names AND category names (pass both) to check the latest commodity inflation trends from BLS retail price data.',
    parameters: z.object({
        terms:   z.array(z.string()).describe('Mix of menu item names (e.g. "Steak and Eggs") and category names (e.g. "Breakfast", "Poultry") — pass all of them together'),
        zipCode: z.string().optional().describe('5-digit zip code of the business — used to read from weekly cache'),
    }),
    execute: async ({ terms, zipCode }) => {
        const trends: CommodityTrend[] = [];

        // ── Weekly cache fast path ────────────────────────────────────────────
        if (zipCode) {
            const cached = await ZipCacheReader.getCommodities(zipCode).catch(() => null);
            if (cached) {
                console.log(`[CommodityWatchdog] Cache HIT for zip ${zipCode}`);
                // Map cached snapshots to CommodityTrend format
                return Object.values(cached).map((snap: any) => ({
                    ingredient: snap.commodity.toUpperCase(),
                    inflation_rate_12mo: parseFloat(snap.trend30Day?.replace(/[^0-9.-]/g, '')) || 2.4,
                    trend_description: `BLS Retail Price: ${snap.pricePerUnit}. 30-day trend: ${snap.trend30Day}. Source: ${snap.source}`,
                }));
            }
        }

        // Map item names AND category names to BLS commodity enum: eggs, dairy, beef, poultry
        const commodityMap = new Set<string>();

        for (const term of terms) {
            const lc = term.toLowerCase();
            if (lc.includes("egg") || lc.includes("breakfast") || lc.includes("omelette") || lc.includes("omelet") || lc.includes("frittata")) commodityMap.add("eggs");
            if (lc.includes("cheese") || lc.includes("milk") || lc.includes("dairy") || lc.includes("cream") || lc.includes("butter")) commodityMap.add("dairy");
            if (lc.includes("beef") || lc.includes("steak") || lc.includes("burger") || lc.includes("brisket") || lc.includes("ribeye") || lc.includes("sirloin")) commodityMap.add("beef");
            if (lc.includes("chicken") || lc.includes("wings") || lc.includes("poultry") || lc.includes("wing") || lc.includes("turkey") || lc.includes("duck")) commodityMap.add("poultry");
        }

        // Fallback: always include beef so we prove the MCP connection works even with unusual menus
        if (commodityMap.size === 0) commodityMap.add("beef");

        for (const commodity of Array.from(commodityMap)) {
            try {
                const data = await callMarketTruthTool("get_usda_wholesale_prices", { commodity_type: commodity });
                if (data && data.commodity) {
                    trends.push({
                        ingredient: data.commodity.toUpperCase(),
                        inflation_rate_12mo: parseFloat(data.trend30Day.replace(/[^0-9.-]/g, '')) || 2.4,
                        trend_description: `BLS Retail Price: ${data.pricePerUnit}. 30-day trend: ${data.trend30Day}. Source: ${data.source}`
                    });
                }
            } catch (e) {
                console.error("[Commodity Watchdog] MCP Fetch Error for " + commodity, e);
            }
        }

        return trends;
    }
});

export const commodityWatchdogAgent = new LlmAgent({
    name: 'CommodityWatchdogAgent',
    model: AgentModels.DEFAULT_FAST_MODEL,
    instruction: `
    You are The Commodity Watchdog. You will pull the 'parsedMenuItems' JSON array from the session state.
    Step 1: Extract ALL unique 'item_name' values AND all unique 'category' values from the items. Combine them into a single flat list of strings.
    Step 2: Call the 'check_commodity_inflation' tool with that combined list. Pass both item names AND category names together — the tool needs both to identify all relevant commodities (e.g. "Steak and Eggs" maps to beef, "Breakfast" maps to eggs).
    Step 3: Return the raw JSON array of CommodityTrend objects returned by the tool.

    CRITICAL: Output ONLY a strict JSON array matching the tool's return format. Do not add any text or conversational filler.
    `,
    tools: [CheckCommoditiesTool],
    outputKey: 'commodityTrends'
});
