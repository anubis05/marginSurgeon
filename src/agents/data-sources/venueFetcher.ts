/**
 * venueFetcher — Foursquare Places API fetch.
 *
 * Called directly by the weekly cache agent. On-demand agents can access
 * the same data through the places-intelligence MCP server.
 *
 * Requires: FOURSQUARE_API_KEY env var.
 * Docs: https://docs.foursquare.com/developer/reference/place-search
 */
import type { VenuePlace, VenueData } from '@/lib/types';

// Foursquare category IDs most relevant to restaurant foot-traffic analysis
const FOURSQUARE_CATEGORIES = [
    '13000', // Food
    '10000', // Arts & Entertainment
    '12000', // Event Venues
    '18000', // Sports & Recreation
    '11000', // Education
].join(',');

export async function fetchNearbyVenues(
    lat: number,
    lng: number,
    radiusMeters = 1500
): Promise<VenueData> {
    const apiKey = process.env.FOURSQUARE_API_KEY;
    const fetchedAt = new Date().toISOString();

    if (!apiKey) {
        console.warn('[venueFetcher] FOURSQUARE_API_KEY not set — returning empty venue list.');
        return { places: [], fetchedAt };
    }

    try {
        const params = new URLSearchParams({
            ll: `${lat},${lng}`,
            radius: String(radiusMeters),
            categories: FOURSQUARE_CATEGORIES,
            fields: 'fsq_id,name,categories,distance,geocodes,popularity',
            limit: '30',
        });

        const res = await fetch(
            `https://api.foursquare.com/v3/places/search?${params}`,
            {
                headers: {
                    Authorization: apiKey,
                    Accept: 'application/json',
                },
            }
        );

        if (!res.ok) {
            console.error(`[venueFetcher] Foursquare API error: ${res.status}`);
            return { places: [], fetchedAt };
        }

        const data = await res.json();
        const results: any[] = data.results ?? [];

        const places: VenuePlace[] = results.map((r: any) => ({
            fsq_id: r.fsq_id,
            name: r.name,
            category: r.categories?.[0]?.name ?? 'Unknown',
            distance: r.distance ?? 0,
            lat: r.geocodes?.main?.latitude ?? lat,
            lng: r.geocodes?.main?.longitude ?? lng,
            popularity: r.popularity ?? undefined,
        }));

        return { places, fetchedAt };

    } catch (e: any) {
        console.error('[venueFetcher] Fetch error:', e.message);
        return { places: [], fetchedAt };
    }
}
