/**
 * Unit tests for weatherFetcher.ts
 *
 * Mocks global fetch. Verifies the NWS two-step flow (points → forecast),
 * 7-day grouping, and all error branches.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWeather } from '@/agents/data-sources/weatherFetcher';

// ── helpers ────────────────────────────────────────────────────────────────────

function makePointsResponse(forecastUrl: string) {
    return { properties: { forecast: forecastUrl } };
}

function makePeriod(date: string, isDaytime: boolean, idx = 0): any {
    return {
        startTime: `${date}T${isDaytime ? '08' : '20'}:00:00`,
        name: isDaytime ? 'Monday' : 'Monday Night',
        isDaytime,
        temperature: isDaytime ? 75 + idx : 55 + idx,
        temperatureUnit: 'F',
        shortForecast: isDaytime ? 'Sunny' : 'Clear',
        probabilityOfPrecipitation: { value: 10 },
        windSpeed: '5 mph',
        windDirection: 'SW',
    };
}

function makeForecastResponse(periods: any[]) {
    return { properties: { periods } };
}

function mockFetch(...responses: Array<{ ok: boolean; data?: any; status?: number }>) {
    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
        const r = responses[callCount++] ?? responses[responses.length - 1];
        return {
            ok: r.ok,
            status: r.status ?? (r.ok ? 200 : 500),
            json: async () => r.data ?? {},
        };
    }));
}

beforeEach(() => { vi.restoreAllMocks(); });

// ── tests ──────────────────────────────────────────────────────────────────────

describe('fetchWeather', () => {
    it('returns a 7-day forecast on success', async () => {
        const dates = ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05',
                       '2026-03-06', '2026-03-07', '2026-03-08'];
        const periods = dates.flatMap((d, i) => [makePeriod(d, true, i), makePeriod(d, false, i)]);

        mockFetch(
            { ok: true, data: makePointsResponse('https://api.weather.gov/forecast/abc') },
            { ok: true, data: makeForecastResponse(periods) }
        );

        const result = await fetchWeather(40.7128, -74.0060);

        expect(result.error).toBeUndefined();
        expect(result.forecast).toHaveLength(7);
        expect(result.forecast[0].date).toBe('2026-03-02');
        expect(result.forecast[0].high).toBe(75);
        expect(result.forecast[0].low).toBe(55);
        expect(result.forecast[0].shortForecast).toBe('Sunny');
    });

    it('caps output at 7 days even when NWS returns more periods', async () => {
        const dates = Array.from({ length: 10 }, (_, i) =>
            `2026-03-${String(i + 2).padStart(2, '0')}`
        );
        const periods = dates.flatMap((d, i) => [makePeriod(d, true, i), makePeriod(d, false, i)]);

        mockFetch(
            { ok: true, data: makePointsResponse('https://api.weather.gov/forecast/abc') },
            { ok: true, data: makeForecastResponse(periods) }
        );

        const result = await fetchWeather(40, -74);
        expect(result.forecast).toHaveLength(7);
    });

    it('returns error when NWS points endpoint fails', async () => {
        mockFetch({ ok: false, status: 503 });

        const result = await fetchWeather(40.7128, -74.0060);
        expect(result.error).toMatch(/503/);
        expect(result.forecast).toHaveLength(0);
    });

    it('returns error when points response has no forecast URL', async () => {
        mockFetch({ ok: true, data: { properties: {} } });

        const result = await fetchWeather(40, -74);
        expect(result.error).toMatch(/forecast URL/);
    });

    it('returns error when the forecast fetch fails', async () => {
        mockFetch(
            { ok: true, data: makePointsResponse('https://api.weather.gov/forecast/abc') },
            { ok: false, status: 404 }
        );

        const result = await fetchWeather(40, -74);
        expect(result.error).toMatch(/404/);
    });

    it('returns error object on network exception', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Network error'); }));

        const result = await fetchWeather(40, -74);
        expect(result.error).toMatch(/Network error/);
    });

    it('uses fallback shortForecast from nighttime when daytime period is missing', async () => {
        const period = makePeriod('2026-03-02', false); // nighttime only
        mockFetch(
            { ok: true, data: makePointsResponse('https://api.weather.gov/forecast/abc') },
            { ok: true, data: makeForecastResponse([period]) }
        );

        const result = await fetchWeather(40, -74);
        expect(result.forecast[0].shortForecast).toBe('Clear');
        expect(result.forecast[0].high).toBeNull();
    });

    it('uses lat/lng in the NWS points URL', async () => {
        const mockFn = vi.fn(async (url: string) => {
            if (url.includes('points')) {
                return { ok: false, status: 500, json: async () => ({}) };
            }
            return { ok: true, json: async () => ({}) };
        });
        vi.stubGlobal('fetch', mockFn);

        await fetchWeather(41.8781, -87.6298);

        expect(mockFn.mock.calls[0][0]).toContain('41.8781');
        expect(mockFn.mock.calls[0][0]).toContain('-87.6298');
    });
});
