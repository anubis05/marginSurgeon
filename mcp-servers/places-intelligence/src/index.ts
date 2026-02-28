/**
 * places-intelligence MCP Server
 *
 * Exposes Foursquare Places API as MCP tools for on-demand agents.
 * The weekly cache agent calls the Foursquare API directly (via venueFetcher.ts)
 * to avoid stdio process overhead in batch runs. On-demand agents that need
 * venue data outside the cached window can use this server.
 *
 * Tools:
 *   get_nearby_venues   — Foursquare Places Search by lat/lng
 *   get_venue_details   — Foursquare Place Details by fsq_id
 *
 * Cache: venues are stable; 7-day Firestore TTL keyed by grid cell.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local') });

try {
    if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'hephae-co' });
    }
} catch (e) {
    console.error('[places-intelligence] Firebase init error:', e);
}

const db = admin.firestore();
const VENUE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Foursquare category IDs relevant to restaurant foot-traffic analysis
const FOURSQUARE_CATEGORIES = ['13000', '10000', '12000', '18000', '11000'].join(',');

async function cachedFetch<T>(collection: string, docId: string, fetcher: () => Promise<T>): Promise<T> {
    const ref = db.collection(collection).doc(docId);
    try {
        const snap = await ref.get();
        if (snap.exists) {
            const d = snap.data()!;
            if (Date.now() - d.timestamp < VENUE_CACHE_TTL_MS) {
                console.error(`[Cache HIT] ${collection}/${docId}`);
                return d.payload as T;
            }
        }
    } catch (e) {
        console.error('[places-intelligence] Cache read error:', e);
    }
    const payload = await fetcher();
    try {
        await ref.set({ timestamp: Date.now(), payload });
    } catch (e) {
        console.error('[places-intelligence] Cache write error:', e);
    }
    return payload;
}

// Round to 3dp (~110m grid) for a stable venue cache key
function gridKey(lat: number, lng: number, radius: number): string {
    return `${lat.toFixed(3)}_${lng.toFixed(3)}_r${radius}`;
}

async function fetchNearbyVenues(lat: number, lng: number, radiusMeters: number): Promise<any[]> {
    const apiKey = process.env.FOURSQUARE_API_KEY;
    if (!apiKey) return [];

    const params = new URLSearchParams({
        ll: `${lat},${lng}`,
        radius: String(radiusMeters),
        categories: FOURSQUARE_CATEGORIES,
        fields: 'fsq_id,name,categories,distance,geocodes,popularity',
        limit: '30',
    });

    const res = await fetch(`https://api.foursquare.com/v3/places/search?${params}`, {
        headers: { Authorization: apiKey, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Foursquare search failed: ${res.status}`);
    const data = await res.json();

    return (data.results ?? []).map((r: any) => ({
        fsq_id: r.fsq_id,
        name: r.name,
        category: r.categories?.[0]?.name ?? 'Unknown',
        distance: r.distance ?? 0,
        lat: r.geocodes?.main?.latitude ?? lat,
        lng: r.geocodes?.main?.longitude ?? lng,
        popularity: r.popularity ?? null,
    }));
}

async function fetchVenueDetails(fsqId: string): Promise<any> {
    const apiKey = process.env.FOURSQUARE_API_KEY;
    if (!apiKey) return { error: 'FOURSQUARE_API_KEY not set' };

    const res = await fetch(
        `https://api.foursquare.com/v3/places/${fsqId}?fields=fsq_id,name,description,hours,rating,price,tips`,
        { headers: { Authorization: apiKey, Accept: 'application/json' } }
    );
    if (!res.ok) throw new Error(`Foursquare details failed: ${res.status}`);
    return res.json();
}

// ── Tool definitions ──────────────────────────────────────────────────────────

const getNearbyVenuesTool: Tool = {
    name: 'get_nearby_venues',
    description: 'Fetch nearby venues from Foursquare Places API. Returns structured venue data including name, category, distance, and popularity score. Use for competitor analysis and foot-traffic driver identification.',
    inputSchema: {
        type: 'object',
        properties: {
            lat:           { type: 'number', description: 'Latitude of the search centre' },
            lng:           { type: 'number', description: 'Longitude of the search centre' },
            radius_meters: { type: 'number', description: 'Search radius in metres (default 1500)', default: 1500 },
        },
        required: ['lat', 'lng'],
    },
};

const getVenueDetailsTool: Tool = {
    name: 'get_venue_details',
    description: 'Fetch detailed information for a specific Foursquare venue by its fsq_id. Returns hours, rating, price tier, and tips.',
    inputSchema: {
        type: 'object',
        properties: {
            fsq_id: { type: 'string', description: 'Foursquare venue ID returned by get_nearby_venues' },
        },
        required: ['fsq_id'],
    },
};

// ── Server setup ──────────────────────────────────────────────────────────────

const server = new Server(
    { name: 'places-intelligence-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [getNearbyVenuesTool, getVenueDetailsTool],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === 'get_nearby_venues') {
            const { lat, lng, radius_meters = 1500 } = args as { lat: number; lng: number; radius_meters?: number };
            const key = gridKey(lat, lng, radius_meters);
            const places = await cachedFetch('cache_venues', key, () => fetchNearbyVenues(lat, lng, radius_meters));
            return { content: [{ type: 'text', text: JSON.stringify(places, null, 2) }] };
        }

        if (name === 'get_venue_details') {
            const { fsq_id } = args as { fsq_id: string };
            const details = await cachedFetch('cache_venue_details', fsq_id, () => fetchVenueDetails(fsq_id));
            return { content: [{ type: 'text', text: JSON.stringify(details, null, 2) }] };
        }

        throw new Error(`Unknown tool: ${name}`);
    } catch (error: any) {
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[places-intelligence] MCP Server running on stdio');
}

main().catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
});
