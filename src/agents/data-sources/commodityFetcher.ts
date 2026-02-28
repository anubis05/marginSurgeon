/**
 * commodityFetcher — direct BLS Average Retail Prices fetch for all 4 commodities.
 *
 * This mirrors the fetch logic in mcp-servers/market-truth/src/index.ts but runs
 * in-process (no stdio MCP overhead), making it suitable for the weekly batch job.
 *
 * On-demand agents continue to use the MCP path (which has its own 7-day cache).
 * The weekly agent calls this directly and stores results in weekly_zip_cache.
 */
import type { CommoditySnapshot, CommoditiesData } from '@/lib/types';

// BLS Average Retail Price series IDs — must stay in sync with MCP server
const BLS_APU_SERIES: Record<string, { seriesId: string; unit: string }> = {
    eggs:    { seriesId: 'APU0000FF1101', unit: '/dozen' },
    beef:    { seriesId: 'APU0000703511', unit: '/lb' },
    poultry: { seriesId: 'APU0000703112', unit: '/lb' },
    dairy:   { seriesId: 'APU0000710212', unit: '/half-gal' },
};

const BLS_FALLBACKS: Record<string, { price: number; trend: string; unit: string }> = {
    eggs:    { price: 3.20, trend: '+5.1%', unit: '/dozen' },
    beef:    { price: 5.85, trend: '+3.2%', unit: '/lb' },
    poultry: { price: 2.10, trend: '+2.8%', unit: '/lb' },
    dairy:   { price: 2.95, trend: '+1.9%', unit: '/half-gal' },
};

async function fetchOneCommodity(commodityType: string): Promise<CommoditySnapshot> {
    const now = new Date().toISOString();
    const seriesInfo = BLS_APU_SERIES[commodityType];
    const apiKey = process.env.BLS_API_KEY;

    if (apiKey && seriesInfo) {
        try {
            const res = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    seriesid: [seriesInfo.seriesId],
                    registrationkey: apiKey,
                }),
            });
            const data = await res.json();
            if (data.status === 'REQUEST_SUCCEEDED' && data.Results?.series?.[0]?.data?.length >= 2) {
                const observations = data.Results.series[0].data;
                const latest = parseFloat(observations[0].value);
                const previous = parseFloat(observations[1].value);
                const trendPct = ((latest - previous) / previous * 100).toFixed(1);
                const trend = (latest >= previous ? '+' : '') + trendPct + '%';
                return {
                    commodity: commodityType,
                    pricePerUnit: `$${latest.toFixed(2)}${seriesInfo.unit}`,
                    trend30Day: trend,
                    source: 'BLS Average Retail Prices (Live)',
                    fetchedAt: now,
                };
            }
        } catch (e) {
            console.error(`[commodityFetcher] BLS fetch error for ${commodityType}:`, e);
        }
    }

    // Fallback to known-good static values
    const fb = BLS_FALLBACKS[commodityType] ?? BLS_FALLBACKS.beef;
    return {
        commodity: commodityType,
        pricePerUnit: `$${fb.price.toFixed(2)}${fb.unit}`,
        trend30Day: fb.trend,
        source: 'BLS Fallback (no live data)',
        fetchedAt: now,
    };
}

export async function fetchAllCommodities(): Promise<CommoditiesData> {
    const [eggs, beef, poultry, dairy] = await Promise.all([
        fetchOneCommodity('eggs'),
        fetchOneCommodity('beef'),
        fetchOneCommodity('poultry'),
        fetchOneCommodity('dairy'),
    ]);
    return { eggs, beef, poultry, dairy };
}
