/**
 * macroFetcher — direct BLS CPI + FRED indicators fetch.
 *
 * Mirrors the fetch logic in mcp-servers/market-truth/src/index.ts but
 * runs in-process for the weekly batch job. On-demand agents continue
 * using the MCP path.
 */
import type { BLSRegion, MacroSnapshot } from '@/lib/types';

const BLS_REGION_SERIES: Record<BLSRegion, string> = {
    Northeast: 'CUUR0100SA0',
    Midwest:   'CUUR0200SA0',
    South:     'CUUR0300SA0',
    West:      'CUUR0400SA0',
};

async function fetchBLSCPI(region: BLSRegion): Promise<{ cpiYoY: string; foodAwayFromHomeYoY: string }> {
    const apiKey = process.env.BLS_API_KEY;
    if (apiKey) {
        try {
            const seriesId = BLS_REGION_SERIES[region];
            const res = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seriesid: [seriesId], registrationkey: apiKey }),
            });
            const data = await res.json();
            if (data.status === 'REQUEST_SUCCEEDED' && data.Results?.series?.[0]?.data?.length >= 2) {
                const obs = data.Results.series[0].data;
                const latest = parseFloat(obs[0].value);
                const yearAgo = parseFloat(obs[12]?.value ?? obs[obs.length - 1].value);
                const yoy = ((latest - yearAgo) / yearAgo * 100).toFixed(1) + '%';
                return { cpiYoY: yoy, foodAwayFromHomeYoY: 'N/A' };
            }
        } catch (e) {
            console.error('[macroFetcher] BLS CPI error:', e);
        }
    }
    return { cpiYoY: '3.2%', foodAwayFromHomeYoY: '4.1%' };
}

async function fetchFREDSeries(seriesId: string): Promise<string> {
    const apiKey = process.env.FRED_API_KEY;
    if (apiKey) {
        try {
            const res = await fetch(
                `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`
            );
            const data = await res.json();
            const obs = data.observations?.[0];
            if (obs?.value && obs.value !== '.') return obs.value;
        } catch (e) {
            console.error(`[macroFetcher] FRED error for ${seriesId}:`, e);
        }
    }
    // Static fallbacks
    if (seriesId === 'UNRATE') return '4.1';
    if (seriesId === 'MEHOINUSA672N') return '74580';
    return 'N/A';
}

export async function fetchMacro(region: BLSRegion): Promise<MacroSnapshot> {
    const [cpi, unemployment, medianHHI] = await Promise.all([
        fetchBLSCPI(region),
        fetchFREDSeries('UNRATE'),
        fetchFREDSeries('MEHOINUSA672N'),
    ]);

    return {
        region,
        cpiYoY: cpi.cpiYoY,
        foodAwayFromHomeYoY: cpi.foodAwayFromHomeYoY,
        unemployment,
        medianHHI,
        source: 'BLS + FRED',
        fetchedAt: new Date().toISOString(),
    };
}
