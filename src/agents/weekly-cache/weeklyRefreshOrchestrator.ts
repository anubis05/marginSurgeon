/**
 * weeklyRefreshOrchestrator — coordinates the full weekly cache refresh for one zip code.
 *
 * Phase 1 (parallel): fetch weather, events, venues, commodities, macroeconomic data.
 * Phase 2 (sequential): synthesize all raw data into WeeklySynthesis via LLM.
 * Phase 3 (sequential): write assembled ZipWeeklyCache to Firestore.
 *
 * Designed to be called from the cron API route or admin dashboard.
 * Each phase is independently error-handled so a single fetcher failure
 * does not abort the whole refresh.
 */
import { fetchWeather }         from '../data-sources/weatherFetcher';
import { fetchEvents }          from '../data-sources/eventsFetcher';
import { fetchNearbyVenues }    from '../data-sources/venueFetcher';
import { fetchAllCommodities }  from '../data-sources/commodityFetcher';
import { fetchMacro }           from '../data-sources/macroFetcher';
import { synthesizeWeeklyData } from './weeklySynthesisAgent';
import { writeZipCache }        from './zipCacheWriter';
import type { ZipRegistryEntry, ZipRawData, WeatherForecast, EventsData, VenueData, CommoditiesData, MacroSnapshot } from '@/lib/types';

export interface RefreshResult {
    zipCode: string;
    success: boolean;
    error?: string;
    durationMs: number;
}

/** Safe wrapper: returns a typed fallback on any error so Phase 1 never throws. */
async function safeRun<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
        return await fn();
    } catch (e: any) {
        console.error(`[weeklyRefresh] ${label} failed:`, e.message);
        return fallback;
    }
}

export async function runWeeklyRefresh(entry: ZipRegistryEntry): Promise<RefreshResult> {
    const start = Date.now();
    const { zipCode, lat, lng, region } = entry;
    console.log(`[weeklyRefresh] Starting refresh for zip ${zipCode} (${region})`);

    try {
        // ── Phase 1: Parallel data fetch ────────────────────────────────────
        const [weather, events, venues, commodities, macroeconomic] = await Promise.all([
            safeRun<WeatherForecast>(
                'weather',
                () => fetchWeather(lat, lng),
                { source: 'NWS', forecast: [], error: 'fetch skipped' }
            ),
            safeRun<EventsData>(
                'events',
                () => fetchEvents(zipCode, lat, lng, 7),
                { items: [], fetchedAt: new Date().toISOString() }
            ),
            safeRun<VenueData>(
                'venues',
                () => fetchNearbyVenues(lat, lng, 1500),
                { places: [], fetchedAt: new Date().toISOString() }
            ),
            safeRun<CommoditiesData>(
                'commodities',
                () => fetchAllCommodities(),
                {
                    eggs:    { commodity: 'eggs',    pricePerUnit: 'N/A', trend30Day: 'N/A', source: 'unavailable', fetchedAt: new Date().toISOString() },
                    beef:    { commodity: 'beef',    pricePerUnit: 'N/A', trend30Day: 'N/A', source: 'unavailable', fetchedAt: new Date().toISOString() },
                    poultry: { commodity: 'poultry', pricePerUnit: 'N/A', trend30Day: 'N/A', source: 'unavailable', fetchedAt: new Date().toISOString() },
                    dairy:   { commodity: 'dairy',   pricePerUnit: 'N/A', trend30Day: 'N/A', source: 'unavailable', fetchedAt: new Date().toISOString() },
                }
            ),
            safeRun<MacroSnapshot>(
                'macro',
                () => fetchMacro(region),
                { region, cpiYoY: 'N/A', foodAwayFromHomeYoY: 'N/A', unemployment: 'N/A', medianHHI: 'N/A', source: 'unavailable', fetchedAt: new Date().toISOString() }
            ),
        ]);

        const raw: ZipRawData = { weather, events, venues, commodities, macroeconomic };
        console.log(`[weeklyRefresh] Phase 1 complete for ${zipCode} (${Date.now() - start}ms)`);

        // ── Phase 2: Synthesis ───────────────────────────────────────────────
        const synthesis = await synthesizeWeeklyData(zipCode, region, raw);
        console.log(`[weeklyRefresh] Phase 2 synthesis complete for ${zipCode}`);

        // ── Phase 3: Persist ─────────────────────────────────────────────────
        await writeZipCache({
            meta: { zipCode, lat, lng, region },
            raw,
            synthesis,
        });

        const durationMs = Date.now() - start;
        console.log(`[weeklyRefresh] Completed ${zipCode} in ${durationMs}ms`);
        return { zipCode, success: true, durationMs };

    } catch (e: any) {
        const durationMs = Date.now() - start;
        console.error(`[weeklyRefresh] FAILED for ${zipCode}:`, e.message);
        return { zipCode, success: false, error: e.message, durationMs };
    }
}
