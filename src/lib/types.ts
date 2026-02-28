export interface BusinessIdentity {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
    persona: string; // e.g., "Old School Jersey Diner", "Modern Cafe"
    name: string;
    menuScreenshotBase64?: string;
}

export interface MenuItem {
    item_name: string;
    current_price: number;
    category: string;
    description?: string;
}

export interface CompetitorPrice {
    competitor_name: string;
    item_match: string;
    price: number;
    source_url: string; // Grounding citation requirement
    distance_miles?: number;
}

export interface CommodityTrend {
    ingredient: string; // e.g., "Eggs", "Bacon"
    inflation_rate_12mo: number; // percentage
    trend_description: string;
}

export interface MenuAnalysisItem extends MenuItem {
    competitor_benchmark: number; // Median of competitors
    commodity_factor: number; // Inflation impact
    recommended_price: number;
    price_leakage: number; // The "loss" per sale
    confidence_score: number; // 0-100
    rationale: string;
}

export interface SurgicalReport {
    identity: BusinessIdentity;
    menu_items: MenuAnalysisItem[];
    strategic_advice: string[]; // From Advisor Agent
    overall_score: number;
    generated_at: string;
}

// --- SEO AUDITOR TYPES ---

export interface Recommendation {
    severity: 'Critical' | 'Warning' | 'Info';
    title: string;
    description: string;
    action: string;
}

export interface Methodology {
    reasoningSteps: string[];
    toolsUsed: string[];
    searchQueries?: string[];
}

export interface AuditSection {
    id: string; // Added ID for reliable selection
    title: string;
    score: number;
    description?: string; // Brief summary from quick scan
    recommendations: Recommendation[];
    methodology?: Methodology; // New field for transparency
    isAnalyzed?: boolean; // Track if this section got the deep dive
}

export interface SeoReport {
    overallScore: number;
    summary: string;
    url: string;
    sections: AuditSection[];
}

export interface QuickScanResult {
    url: string;
    overallScore: number;
    summary: string;
    categories: {
        id: string;
        title: string;
        score: number;
        description: string;
    }[];
}

// ── Social Media Strategy types ───────────────────────────────────────────────

export interface SocialChannelAudit {
    platform: string;              // 'Instagram' | 'TikTok' | 'Facebook' | 'YouTube' | etc.
    url?: string;
    estimatedFollowers?: string;
    postingFrequency?: string;     // e.g. '3x per week'
    engagementLevel: 'none' | 'low' | 'medium' | 'high';
    topContentType?: string;       // e.g. 'Food photography', 'Reels', 'Stories'
    weaknesses?: string[];
    score: number;                 // 0–100
}

export interface CompetitorSocialProfile {
    name: string;
    platforms: {
        platform: string;
        url?: string;
        estimatedFollowers?: string;
        contentStyle?: string;
    }[];
    strongestPlatform?: string;
    totalEstimatedFollowers?: string;
    contentStrategy?: string;
    threatLevel: number;           // 1–10
}

export interface ContentPillar {
    name: string;                  // e.g. 'Behind-the-Kitchen Reels'
    platform: string;
    postingFrequency: string;      // e.g. '3x per week'
    rationale: string;
    examplePrompt: string;         // Concrete post idea
}

export interface SocialStrategyReport {
    business: {
        name: string;
        address?: string;
    };
    overallScore: number;          // 0–100
    executiveSummary: string;
    channelAudits: SocialChannelAudit[];
    competitorProfiles: CompetitorSocialProfile[];
    gapAnalysis: string[];         // Key gaps vs competitors
    contentPillars: ContentPillar[];
    quickWins: string[];           // 3–5 things to do this week
    thirtyDayPlan: string[];       // Ordered weekly steps
    reportUrl?: string;
    generatedAt: string;
}

// ── Weekly Zip Cache types ────────────────────────────────────────────────────

export type BLSRegion = 'Northeast' | 'Midwest' | 'South' | 'West';

export interface WeatherDay {
    date: string;            // YYYY-MM-DD
    dayOfWeek: string;
    high: number | null;
    low: number | null;
    temperatureUnit: string;
    shortForecast: string;
    precipitationChance: number | null;
    windSpeed: string | null;
    windDirection: string | null;
}

export interface WeatherForecast {
    source: string;
    forecast: WeatherDay[];
    error?: string;
}

export interface EventItem {
    date: string;            // YYYY-MM-DD or human-readable
    name: string;
    venue?: string;
    category: string;        // 'sports' | 'music' | 'community' | 'festival' | 'other'
    estimatedAttendance?: 'small' | 'medium' | 'large';
}

export interface EventsData {
    items: EventItem[];
    fetchedAt: string;       // ISO timestamp
}

export interface VenuePlace {
    fsq_id: string;
    name: string;
    category: string;
    distance: number;        // metres
    lat: number;
    lng: number;
    popularity?: number;     // Foursquare 0–1
    address?: string;
}

export interface VenueData {
    places: VenuePlace[];
    fetchedAt: string;
}

export interface CommoditySnapshot {
    commodity: string;
    pricePerUnit: string;
    trend30Day: string;
    source: string;
    fetchedAt: string;
}

export interface CommoditiesData {
    eggs: CommoditySnapshot;
    beef: CommoditySnapshot;
    poultry: CommoditySnapshot;
    dairy: CommoditySnapshot;
}

export interface MacroSnapshot {
    region: string;
    cpiYoY: string;
    foodAwayFromHomeYoY: string;
    unemployment: string;
    medianHHI: string;
    source: string;
    fetchedAt: string;
}

// Aggregated raw data stored per zip code
export interface ZipRawData {
    weather: WeatherForecast;
    events: EventsData;
    venues: VenueData;
    commodities: CommoditiesData;
    macroeconomic: MacroSnapshot;
}

// Synthesized weekly intelligence (LLM-produced)
export interface TrafficOutlook {
    overallRating: 'slow' | 'moderate' | 'strong' | 'exceptional';
    peakDay: string;
    riskWindows: string[];
    boostWindows: string[];
    keyDrivers: string[];
    weeklyHeadline: string;
}

export interface CommodityAlert {
    commodity: string;
    severity: 'info' | 'warning' | 'critical';
    inflationRate: number;
    suggestedPriceAdjustment: string;
    affectedMenuCategories: string[];
    actionBullet: string;
}

export interface EconomicContext {
    consumerPressure: 'low' | 'moderate' | 'high';
    priceIncreaseSafety: 'safe_large' | 'safe_small' | 'cautious' | 'avoid';
    unemploymentRate: number;
    cpiYoY: number;
    headline: string;
}

export interface CompetitorLandscape {
    totalVenuesInRadius: number;
    saturationLevel: 'low' | 'medium' | 'high';
    dominantCuisines: string[];
    whiteSpaceOpportunities: string[];
    averagePricePoint: string;
    threatLevel: 'low' | 'medium' | 'high';
    headline: string;
}

export interface WeeklySynthesis {
    zipCode: string;
    weekOf: string;          // ISO date of the Monday of this week
    synthesizedAt: string;
    trafficOutlook: TrafficOutlook;
    commodityAlerts: CommodityAlert[];
    economicContext: EconomicContext;
    competitorLandscape: CompetitorLandscape;
    weeklyBullets: string[];
    agentHints: {
        forecaster: string;
        surgeon: string;
        advisor: string;
        seo: string;
    };
}

export interface ZipWeeklyCache {
    meta: {
        zipCode: string;
        lat: number;
        lng: number;
        region: BLSRegion;
        schemaVersion: number;
        refreshedAt: string;   // ISO timestamp
        expiresAt: string;     // ISO timestamp (refreshedAt + 7 days)
    };
    raw: ZipRawData;
    synthesis: WeeklySynthesis;
}

export interface ZipRegistryEntry {
    zipCode: string;
    lat: number;
    lng: number;
    region: BLSRegion;
    isActive: boolean;
    businessCount: number;
    addedAt: string;
    lastRefreshedAt?: string;
}
