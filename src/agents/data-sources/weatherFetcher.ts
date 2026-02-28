/**
 * weatherFetcher — pure NWS fetch, no cache, no agent framework.
 *
 * Shared by:
 *  - WeeklyCacheAgent  (proactive weekly pre-fetch, keyed by zip code)
 *  - ForecasterAgent   (on-demand fallback when weekly cache is cold)
 *
 * The cache TTL and Firestore writes live in the callers — this module
 * only concerns itself with hitting the NWS API and shaping the response.
 */
import type { WeatherDay, WeatherForecast } from '@/lib/types';

export async function fetchWeather(lat: number, lng: number): Promise<WeatherForecast> {
    try {
        const pointsRes = await fetch(
            `https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`,
            { headers: { 'User-Agent': 'HephaeHub/1.0 (hephae.co)' } }
        );
        if (!pointsRes.ok) {
            return { source: 'NWS', forecast: [], error: `NWS points lookup failed: ${pointsRes.status}` };
        }
        const pointsData = await pointsRes.json();
        const forecastUrl: string | undefined = pointsData?.properties?.forecast;
        if (!forecastUrl) {
            return { source: 'NWS', forecast: [], error: 'NWS did not return a forecast URL.' };
        }

        const forecastRes = await fetch(forecastUrl, {
            headers: { 'User-Agent': 'HephaeHub/1.0 (hephae.co)' }
        });
        if (!forecastRes.ok) {
            return { source: 'NWS', forecast: [], error: `NWS forecast fetch failed: ${forecastRes.status}` };
        }
        const forecastData = await forecastRes.json();
        const periods: any[] = forecastData?.properties?.periods ?? [];

        // Group daytime/nighttime into calendar days
        const days: Record<string, any> = {};
        for (const period of periods.slice(0, 14)) {
            const date: string = period.startTime?.split('T')[0];
            if (!date) continue;
            if (!days[date]) days[date] = { date, dayOfWeek: period.name, daytime: null, nighttime: null };
            if (period.isDaytime) {
                days[date].daytime = {
                    shortForecast: period.shortForecast,
                    temperature: period.temperature,
                    temperatureUnit: period.temperatureUnit,
                    precipitationChance: period.probabilityOfPrecipitation?.value ?? null,
                    windSpeed: period.windSpeed,
                    windDirection: period.windDirection,
                };
            } else {
                days[date].nighttime = {
                    shortForecast: period.shortForecast,
                    temperature: period.temperature,
                    temperatureUnit: period.temperatureUnit,
                    precipitationChance: period.probabilityOfPrecipitation?.value ?? null,
                };
            }
        }

        const forecast: WeatherDay[] = Object.values(days).slice(0, 7).map((day: any) => ({
            date: day.date,
            dayOfWeek: day.dayOfWeek,
            high: day.daytime?.temperature ?? null,
            low: day.nighttime?.temperature ?? null,
            temperatureUnit: day.daytime?.temperatureUnit ?? 'F',
            shortForecast: day.daytime?.shortForecast ?? day.nighttime?.shortForecast ?? 'Unknown',
            precipitationChance: day.daytime?.precipitationChance ?? day.nighttime?.precipitationChance ?? null,
            windSpeed: day.daytime?.windSpeed ?? null,
            windDirection: day.daytime?.windDirection ?? null,
        }));

        return { source: 'NWS (National Weather Service)', forecast };

    } catch (e: any) {
        return { source: 'NWS', forecast: [], error: `NWS fetch failed: ${e.message}` };
    }
}
